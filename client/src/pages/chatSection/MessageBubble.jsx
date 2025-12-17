import { useRef, useState } from "react";
import { format } from "date-fns";
import {
  FaCheck,
  FaCheckDouble,
  FaPlus,
  FaRegCopy,
  FaRegTrashAlt,
  FaSmile,
} from "react-icons/fa";
import { BsThreeDotsVertical } from "react-icons/bs";
import { GiCrossMark } from "react-icons/gi";
import useOutsideClick from "../../hooks/useOutsideClicks";
import EmojiPicker from "emoji-picker-react";
import { FaRegFileAlt } from "react-icons/fa";

const MessageBubble = ({
  message,
  theme,
  currentUser,
  onReact,
  deleteMessage,
}) => {
  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    const thresh = 1024;
    if (Math.abs(bytes) < thresh) return bytes + " B";
    const units = ["KB", "MB", "GB", "TB"];
    let u = -1;
    do {
      bytes /= thresh;
      ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + " " + units[u];
  };
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReaction, setShowReaction] = useState(false);
  const messageRef = useRef(null);
  const [showOptions, setShowOptions] = useState(false);
  const optionRef = useRef(null);

  const emojiPickerRef = useRef(null);
  const reactionsMenuRef = useRef(null);

  const currentUserId = currentUser?._id?.toString();
  const senderId = message.sender?._id?.toString();
  const isUserMessage = senderId === currentUserId;
  const bubbleClass = isUserMessage ? `chat-end` : `chat-start`;

  const bubbleContentClass = isUserMessage
    ? `chat-bubble md:max-w-[50%] ${
        theme === "dark"
          ? "bg-purple-900 text-white"
          : "bg-violet-300 text-black"
      } `
    : `chat-bubble md:max-w-[50%] ${
        theme === "dark"
          ? "bg-purple-900 text-white"
          : "bg-violet-300 text-black"
      }`;

  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  const handleReact = (emoji) => {
    onReact(message._id.toString(), emoji);
    setShowEmojiPicker(false);
    setShowReaction(false);
  };

  useOutsideClick(emojiPickerRef, () => {
    if (showEmojiPicker) setShowEmojiPicker(false);
  });

  useOutsideClick(reactionsMenuRef, () => {
    if (showReaction) setShowReaction(false);
  });

  useOutsideClick(optionRef, () => {
    if (showOptions) setShowOptions(false);
  });

  if (message === 0) return;

  return (
    <>
      <div className={`chat ${bubbleClass}`}>
        <div
          className={`${bubbleContentClass} relative group`}
          ref={messageRef}
        >
          <div className="flex justify-center gap-2">
            {message.contentType === "text" && (
              <p className="mr-2">{message.content}</p>
            )}

            {message.contentType === "image" && (
              <div>
                <img
                  src={message.imageOrVideoUrl}
                  alt="Image"
                  className="rounded-lg max-w-xs"
                />
                <p className="mt-1">{message.content}</p>
              </div>
            )}

            {message.contentType === "video" && (
              <div>
                <video
                  controls
                  src={message.imageOrVideoUrl}
                  alt="video"
                  className="rounded-lg max-w-xs"
                />
                <p className="mt-1">{message.content}</p>
              </div>
            )}

            {message.contentType === "document" && (
              <div className="flex flex-col gap-2 p-2 border rounded-md max-w-xs">
                <a
                  href={message.imageOrVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3"
                >
                  <FaRegFileAlt className="w-10 h-10 text-gray-600" />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {message.documentName || message.content || "Document"}
                    </span>
                    {message.documentSize ? (
                      <span className="text-xs text-gray-500">
                        {formatBytes(message.documentSize)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">
                        Click to open
                      </span>
                    )}
                  </div>
                </a>

                {/* Upload progress bar for in-flight/optimistic messages */}
                {typeof message.uploadProgress === "number" &&
                  message.uploadProgress < 100 && (
                    <div className="w-full bg-gray-200 h-2 rounded overflow-hidden mt-2">
                      <div
                        className="h-2 bg-indigo-500"
                        style={{ width: `${message.uploadProgress}%` }}
                      />
                    </div>
                  )}
              </div>
            )}
          </div>
          <div className="self-end flex items-center justify-end gap-1 text-xs opacity-60 mt-4 ml-2">
            <span>{format(new Date(message.createdAt), "h:mm a")}</span>
            {isUserMessage && (
              <>
                {message.messageStatus === "send" && <FaCheck size={12} />}
                {message.messageStatus === "delivered" && (
                  <FaCheckDouble size={12} />
                )}
                {message.messageStatus === "read" && (
                  <FaCheckDouble size={12} className="text-indigo-400" />
                )}
              </>
            )}
          </div>

          <div className=" absolute top-1 right-1 opacity-0 group-hover:opacity-100">
            <button
              onClick={() => setShowOptions((prev) => !prev)}
              className={`cursor-pointer rounded-full ${
                theme === "dark" ? "text-white" : "text-gray-800"
              }`}
            >
              <BsThreeDotsVertical size={18} />
            </button>
          </div>

          <div
            className={`absolute ${
              isUserMessage ? "-left-10" : "-right-10"
            } top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2`}
          >
            <button
              className={`p-2 rounded-full ${
                theme === "dark"
                  ? "bg-gray-600 hover:bg-gray-700"
                  : "bg-violet-200 hover:bg-violet-300"
              } shadow-lg`}
              onClick={() => setShowReaction(!showReaction)}
            >
              <FaSmile
                className={`${
                  theme === "dark" ? "text-gray-300" : "text-gray-500"
                }`}
              />
            </button>
          </div>

          {showReaction && (
            <div
              ref={reactionsMenuRef}
              className={` absolute -top-8 ${
                isUserMessage ? "left-0" : "left-36"
              } transform -translate-x-1/2 flex items-center bg-gray-800 rounded-full px-2 py-1.5 gap-1 shadow-lg z-50`}
            >
              {quickReactions.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleReact(emoji)}
                  className="hover:scale-125 transition-transform p-1"
                >
                  {emoji}
                </button>
              ))}
              <div className="w-px h-5 bg-gray-500 mx-1" />
              <button
                className="hover:bg-gray-700 rounded-full p-1"
                onClick={() => setShowEmojiPicker(true)}
              >
                <FaPlus className=" h-4 w-4 text-gray-300" />
              </button>
            </div>
          )}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className=" absolute top-5 right-40 mb-6 z-50"
            >
              <div className=" relative">
                <EmojiPicker
                  onEmojiClick={(emojiObject) => handleReact(emojiObject.emoji)}
                  theme={theme === "dark" ? "dark" : "light"}
                />
                <button
                  onClick={() => setShowEmojiPicker(false)}
                  className=" absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                >
                  <GiCrossMark />
                </button>
              </div>
            </div>
          )}

          {message.reactions && message.reactions.length > 0 && (
            <div
              className={` absolute -bottom-2 ${
                isUserMessage ? "-left-2" : "-right-6"
              } ${
                theme === "dark" ? "bg-transparent" : "bg-gray-200"
              } rounded-full px-2 shadow-md`}
            >
              {message.reactions
                .filter((reaction) => reaction && reaction._id) // 👈 Filter out null/undefined reactions or reactions without _id
                .map((reaction) => (
                  <span key={reaction._id.toString()} className="mr-1">
                    {reaction.emoji}
                  </span>
                ))}
            </div>
          )}

          {showOptions && (
            <div
              ref={optionRef}
              className={` absolute top-8 right-1 z-50 w-36 rounded-xl shadow-lg py-2 text-sm ${
                theme === "dark"
                  ? "bg-gray-800 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              <button
                onClick={() => {
                  if (message.contentType === "text") {
                    navigator.clipboard.writeText(message.content);
                  }
                  setShowOptions(false);
                }}
                className={`flex items-center w-full px-4 py-2 gap-3 rounded-lg cursor-pointer ${
                  theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-300"
                }`}
              >
                <FaRegCopy size={14} />
                <span>Copy</span>
              </button>

              {isUserMessage && (
                <button
                  onClick={() => {
                    deleteMessage(message._id);
                    setShowOptions(false);
                  }}
                  className={`flex items-center w-full px-4 py-2 gap-3 rounded-lg text-red-500 cursor-pointer ${
                    theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-300"
                  }`}
                >
                  <FaRegTrashAlt className="text-red-500" size={14} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MessageBubble;
