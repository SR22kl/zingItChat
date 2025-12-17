import { format, isToday, isYesterday } from "date-fns";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AiOutlineSend } from "react-icons/ai";
import { FaSpinner } from "react-icons/fa";
import {
  FaArrowLeft,
  FaEllipsisV,
  FaImage,
  FaLock,
  FaPaperclip,
  FaRegFileAlt,
  FaSmile,
  FaTimes,
  FaVideo,
} from "react-icons/fa";
import ZingPic from "../../images/zingITpic.png";
import { useChatStore } from "../../store/chatStore";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";

import EmojiPicker from "emoji-picker-react";
import MessageBubble from "./MessageBubble";
import { GiCrossMark } from "react-icons/gi";
import VideoCallManager from "../videoCall/VideoCallManager";
import { getSocket } from "../../services/chatService";
import useVideoCallStore from "../../store/videoCallStore";

const isValidate = (date) => {
  return date instanceof Date && !isNaN(date);
};

const backUserPic =
  "https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg?semt=ais_hybrid&w=740&q=80";

const ChatWindow = ({ selectedContact, setSelectedContact, isMobile }) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isInitializingUpload, setIsInitializingUpload] = useState(false);
  const [uploadController, setUploadController] = useState(null);
  const [failedUpload, setFailedUpload] = useState(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);

  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const socket = getSocket();

  const {
    messages,
    loading,
    sendMessage,
    recieveMessage,
    fetchMessages,
    conversations,
    fetchCoversations,
    markMessagesAsRead,
    deleteMessage,
    addReaction,
    startTyping,
    stopTyping,
    isUserTyping,
    isUserOnline,
    getUserlastSeen,
    cleanup,
  } = useChatStore();

  // Get the current conversation object (Memoized)
  const currentConversation = useMemo(() => {
    return conversations?.data?.find((conv) =>
      conv.participants.some(
        (participant) => participant._id === selectedContact?._id
      )
    );
  }, [conversations, selectedContact]);

  const currentConversationId = currentConversation?._id;

  // Get online status & lastseen
  const online = isUserOnline(selectedContact?._id);
  const lastSeen = getUserlastSeen(selectedContact?._id);
  const isTyping = isUserTyping(selectedContact?._id);

  // 1. Fetch messages when a contact is selected and conversation is found
  useEffect(() => {
    if (selectedContact?._id && currentConversationId) {
      fetchMessages(currentConversationId);
    }
  }, [selectedContact, currentConversationId, fetchMessages]); // Added fetchMessages to dependencies

  // 1.5. Ensure socket joins the conversation room when conversation changes
  useEffect(() => {
    if (currentConversationId && socket) {
      socket.emit("join_conversation", currentConversationId);
    }
  }, [currentConversationId, socket]);

  // 2. Initial fetch for conversations (runs once)
  // Request user status when contact is selected
  useEffect(() => {
    if (selectedContact?._id && socket) {
      socket.emit("get_user_status", selectedContact._id, (status) => {
        // Status will be handled by the store's user_status listener
      });
    }
  }, [selectedContact, socket]);

  useEffect(() => {
    fetchCoversations();
  }, [fetchCoversations]); // Added fetchCoversations to dependencies

  // 3. Scroll to bottom when messages update
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 4. Typing status debounce
  useEffect(() => {
    if (message && selectedContact) {
      startTyping(selectedContact?._id);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedContact?._id);
      }, 3000);
    } else if (!message && selectedContact) {
      // Stop typing immediately if the input is cleared
      stopTyping(selectedContact?._id);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, selectedContact, startTyping, stopTyping]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setShowFileMenu(false);

      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(null);
      }
    }
    e.target.value = null;
  };

  const handleFileSelectionClick = (acceptType) => {
    setShowFileMenu(false);
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptType;
      fileInputRef.current.click();
    }
  };

  const handleSendMessage = async () => {
    if (!selectedContact) return;

    if (!message.trim() && !selectedFile) return;

    // Do not clear filePreview here — keep it visible during upload/retry flow

    try {
      const formData = new FormData();
      formData.append("senderId", user?._id);
      formData.append("receiverId", selectedContact?._id);

      const status = online ? "delivered" : "send";
      formData.append("messageStatus", status);

      if (message.trim()) {
        formData.append("content", message.trim());
      }
      // if there is file include that too
      if (selectedFile) {
        formData.append("media", selectedFile, selectedFile.name);
      }

      // if a file is present, track upload progress and show overlay
      if (selectedFile) {
        // create an AbortController so the upload can be cancelled
        const controller = new AbortController();
        setUploadController(controller);

        setIsUploading(true);
        setIsInitializingUpload(true);
        setUploadProgress(null);
        try {
          await sendMessage(formData, {
            signal: controller.signal,
            onProgress: (percent) => {
              // mark initialization as finished on first progress event
              if (isInitializingUpload) setIsInitializingUpload(false);
              setUploadProgress(percent);
              if (percent >= 100) {
                // ensure small delay so UI shows full bar
                setTimeout(() => {
                  setIsUploading(false);
                  setUploadProgress(null);
                  setIsInitializingUpload(false);
                  setUploadController(null);
                  setFailedUpload(null);
                }, 300);
              }
            },
          });
        } catch (err) {
          // If aborted or failed, keep file info for retry
          setFailedUpload({
            file: selectedFile,
            preview: filePreview,
            error:
              err?.response?.data?.message || err?.message || "Upload failed",
          });
          setIsUploading(false);
          setUploadProgress(null);
          setIsInitializingUpload(false);
          setUploadController(null);
          // do not rethrow — we handle retry in UI
        }
      } else {
        await sendMessage(formData);
      }

      // clear state
      setMessage("");
      // clear only if upload succeeded
      if (!failedUpload) {
        setSelectedFile(null);
        setFilePreview(null);
      }
      setIsUploading(false);
      setUploadProgress(null);
      setIsInitializingUpload(false);
      setShowFileMenu(false);
    } catch (error) {
      console.error("failed to send message", error);
    }
  };

  const renderDateSeparator = (date) => {
    if (!isValidate(date)) {
      return null;
    }
    let dateString;
    if (isToday(date)) {
      dateString = "Today";
    } else if (isYesterday(date)) {
      dateString = "Yesterday";
    } else {
      dateString = format(date, "EEEE, MMMM d");
    }
    return (
      <div className="flex justify-center my-4">
        <span
          className={`px-4 py-2 rounded-full text-sm ${
            theme === "dark"
              ? "bg-gray-600 text-gray-300"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {dateString}
        </span>
      </div>
    );
  };

  // Group message of particular day (Memoized)
  const groupMessages = useMemo(() => {
    return Array.isArray(messages)
      ? messages.reduce((acc, message) => {
          if (!message.createdAt) return acc;
          const date = new Date(message.createdAt);
          if (isValidate(date)) {
            const dateString = format(date, "yyyy-MM-dd");
            if (!acc[dateString]) {
              acc[dateString] = [];
            }
            acc[dateString].push(message);
          } else {
            console.error("invalid date for message", date);
          }
          return acc;
        }, {})
      : {};
  }, [messages]);

  const handleReaction = useCallback(
    (messageId, emoji) => {
      addReaction(messageId, emoji);
    },
    [addReaction]
  );

  const handleDeleteMessage = useCallback(
    (messageId) => {
      deleteMessage(messageId);
    },
    [deleteMessage]
  );

  const handleVideoCall = () => {
    if (selectedContact && online) {
      const { initiateCall } = useVideoCallStore.getState();

      const avatar = selectedContact?.profilePicture || backUserPic;

      initiateCall(
        selectedContact._id,
        selectedContact.userName,
        avatar,
        "video"
      );
    } else {
      alert("User is offline. Cannot initiate video call.");
    }
  };

  if (!selectedContact) {
    return (
      <>
        <div className="flex-1 flex flex-col items-center justify-center mx-auto h-screen text-center">
          <div className="max-w-md">
            <img src={ZingPic} alt="zingIT" className="w-full h-auto" />
            <h2
              className={`text-3xl font-semibold mb-4 ${
                theme === "dark" ? "text-white" : "text-gray-800"
              }`}
            >
              Select a chat to start messaging
            </h2>
            <p
              className={`${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              } mb-6`}
            >
              Choose a contact from your chat list to start a conversation.
            </p>
            <p
              className={`${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              } text-sm mt-8 flex items-center justify-center gap-2`}
            >
              <FaLock className="w-4 h-4" />
              Your personal messages are end-to-end encrypted.
            </p>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="flex-1 h-screen w-full flex flex-col">
        {/* Chat Header */}
        <div
          className={`p-4 ${
            theme === "dark"
              ? "bg-slate-900 text-white"
              : "bg-gray-300 text-gray-600"
          } flex items-center`}
        >
          <button
            className="mr-2 focus:outline-none"
            onClick={() => setSelectedContact(null)}
          >
            <FaArrowLeft className="h-6 w-6 hover:-translate-x-1.5 transition duration-300 ease-in" />
          </button>
          <img
            src={selectedContact?.profilePicture || backUserPic}
            alt={selectedContact?.userName || "User"}
            className="w-10 h-10 rounded-full"
          />
          <div className="ml-3 grow">
            <h2 className="font-semibold text-start">
              {selectedContact?.userName || "Unkonwn User"}
            </h2>
            {isTyping ? (
              <p className="text-sm text-green-500">Typing...</p>
            ) : (
              <p
                className={`text-xs ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {online
                  ? "Online"
                  : lastSeen
                  ? `Last seen ${format(new Date(lastSeen), "HH:mm")}`
                  : "Offline"}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleVideoCall}
              className="focus:outline-none"
              title={online ? "Start Video Call" : "User is offline"}
            >
              <FaVideo className="h-6 w-6 text-purple-500 hover:text-purple-600" />
            </button>
            <button className="focus:outline-none">
              <FaEllipsisV className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Message Area */}
        <div
          className={`flex-1 p-4 overflow-y-auto ${
            theme === "dark" ? "bg-slate-950" : "bg-yellow-50"
          }`}
        >
          {Object.entries(groupMessages).map(([date, msgs]) => (
            <React.Fragment key={date}>
              {renderDateSeparator(new Date(date))}
              {msgs.map((msg) => (
                <MessageBubble
                  // Use tempId for un-persisted optimistic updates
                  key={msg._id || msg.tempId}
                  message={msg}
                  theme={theme}
                  currentUser={user}
                  onReact={handleReaction}
                  deleteMessage={handleDeleteMessage}
                />
              ))}
            </React.Fragment>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* File Preview */}
        {selectedFile && (
          <div className="relative p-2 flex justify-center">
            {filePreview ? (
              <div className="relative">
                {selectedFile.type.startsWith("video/") ? (
                  <video
                    src={filePreview}
                    controls
                    className="w-80 object-cover rounded shadow-lg mx-auto"
                  />
                ) : (
                  <img
                    src={filePreview}
                    alt="file-preview"
                    className="w-80 h-auto object-cover shadow-lg mx-auto rounded-lg"
                  />
                )}

                {/* Upload overlay */}
                {isUploading && isInitializingUpload && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center rounded-lg">
                    <FaSpinner className="animate-spin text-white text-2xl mb-2" />
                    <div className="text-white text-sm">
                      Initializing upload...
                    </div>
                  </div>
                )}

                {isUploading &&
                  typeof uploadProgress === "number" &&
                  !isInitializingUpload && (
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center rounded-lg">
                      <div className="text-white text-sm mb-2">
                        Uploading {uploadProgress}%
                      </div>
                      <div className="w-56 bg-gray-200 h-2 rounded overflow-hidden">
                        <div
                          className="h-2 bg-indigo-400"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                <button
                  className=" absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                  onClick={() => {
                    // if upload in progress, abort
                    if (uploadController) {
                      try {
                        uploadController.abort();
                      } catch (e) {
                        console.error("abort error", e);
                      }
                      setUploadController(null);
                    }
                    setSelectedFile(null);
                    setFilePreview(null);
                    setIsUploading(false);
                    setUploadProgress(null);
                    setIsInitializingUpload(false);
                  }}
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            ) : (
              // Document tile preview when no image/video preview is available
              <div className="w-full max-w-xs p-3 bg-white rounded-lg shadow-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaRegFileAlt className="w-8 h-8 text-gray-600" />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {Math.round(selectedFile.size / 1024)} KB
                    </span>
                  </div>
                </div>
                <div className="ml-3 w-32">
                  {isUploading && isInitializingUpload ? (
                    <div className="flex flex-col items-center">
                      <FaSpinner className="animate-spin text-gray-600 mb-1" />
                      <div className="text-xs text-gray-600">
                        Initializing...
                      </div>
                    </div>
                  ) : isUploading && typeof uploadProgress === "number" ? (
                    <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
                      <div
                        className="h-2 bg-indigo-500"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        // if upload in progress, abort
                        if (uploadController) {
                          try {
                            uploadController.abort();
                          } catch (e) {
                            console.error("abort error", e);
                          }
                          setUploadController(null);
                        }
                        // allow clearing before upload
                        setSelectedFile(null);
                        setFilePreview(null);
                        setIsUploading(false);
                        setUploadProgress(null);
                        setIsInitializingUpload(false);
                      }}
                      className="text-sm text-gray-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message Input Area */}
        <div
          className={`p-4 ${
            theme === "dark" ? "bg-slate-800" : "bg-gray-300"
          } flex items-center space-x-2 relative`}
        >
          {/* Emoji Picker Button */}
          <button
            className="focus:outline-none"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <FaSmile
              className={`h-6 w-6 cursor-pointer ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            />
          </button>
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className=" absolute left-1 bottom-16 z-50"
            >
              <EmojiPicker
                onEmojiClick={(emojiObject) => {
                  setMessage((prev) => prev + emojiObject.emoji);
                  // Optionally close the picker after selection
                  // setShowEmojiPicker(false);
                }}
                theme={theme === "dark" ? "dark" : "light"}
              />
              <button
                onClick={() => setShowEmojiPicker(false)}
                className=" absolute top-2 right-2 text-gray-400 hover:text-gray-500"
              >
                <GiCrossMark />
              </button>
            </div>
          )}

          {/* Attachment Menu Button */}
          {/* Always-present hidden file input (so clicks work even after menu closes) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            // accept attribute is set dynamically in handleFileSelectionClick
            className="hidden"
          />

          <div className=" relative">
            <button
              onClick={() => setShowFileMenu(!showFileMenu)}
              className="focus:outline-none"
            >
              <FaPaperclip
                className={`h-6 w-6 cursor-pointer mt-1 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              />
            </button>
            {showFileMenu && (
              <div
                className={`absolute bottom-full left-0 mb-2 ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                } rounded-lg shadow-lg z-50`}
              >
                {/* 🌟 Calls handler to set accept and click input */}
                <button
                  onClick={() => handleFileSelectionClick("image/*,video/*")}
                  className={`flex items-center w-full py-2 px-4 transition-colors ${
                    theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
                  } rounded-t-lg `}
                >
                  <FaImage className="mr-1 h-5 w-5" /> Image/Video
                </button>

                {/* 🌟 Calls handler to set accept and click input */}
                <button
                  onClick={() =>
                    handleFileSelectionClick(
                      "application/pdf,application/msword,text/plain"
                    )
                  }
                  className={`flex items-center w-full py-2 px-4 transition-colors ${
                    theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
                  } rounded-b-lg `}
                >
                  <FaRegFileAlt className="mr-1 h-5 w-5" /> Documents
                </button>
              </div>
            )}
          </div>

          {/* Text Input */}
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            className={`grow border rounded-full py-2 px-4 ${
              theme === "dark"
                ? "bg-slate-900 text-white border-gray-600"
                : "bg-white text-gray-800 border-gray-300"
            } focus:outline-none focus:ring-2 focus:ring-purple-800 focus:border-transparent`}
          />

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            className="focus:outline-none"
            // 🌟 FIX: Disable if both fields are empty
            disabled={!message.trim() && !selectedFile}
          >
            <p
              className={`p-2 border rounded-full items-center justify-center ${
                theme === "dark"
                  ? " bg-indigo-500 text-gray-200 border-indigo-400"
                  : "bg-purple-500 text-gray-200"
              }`}
            >
              <AiOutlineSend
                className={`h-6 w-6 cursor-pointer transition hover:translate-x-1.5 duration-300 ease-in`}
              />
            </p>
          </button>
        </div>
      </div>

      <VideoCallManager socket={socket} />
    </>
  );
};

export default ChatWindow;
