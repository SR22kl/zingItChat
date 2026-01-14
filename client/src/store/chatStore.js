import { create } from "zustand";
import { getSocket } from "../services/chatService";
import axiosInstance from "../services/urlServices";

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  onlineUsers: new Map(),
  typingUsers: new Map(),

  //socked event listners setup
  initsoketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    //remove existing listeners to prevent duplicate handlers
    socket.off("send_message");
    socket.off("receive_message");
    socket.off("user_typing");
    socket.off("user_status");
    socket.off("message_error");
    socket.off("message_deleted");
    socket.off("refetch_messages"); // <-- Cleaned up listeners

    //listen for incoming messages (server may emit different event names)
    socket.on("receive_message", (message) => {
      try {
        console.debug("socket: receive_message", message);
        get().recieveMessage(message);
      } catch (e) {
        console.error("Error handling receive_message", e);
      }
    });

    // server sometimes emits 'new_message' when a message is stored
    socket.on("new_message", (message) => {
      try {
        console.debug("socket: new_message", message);
        get().recieveMessage(message);
      } catch (e) {
        console.error("Error handling new_message", e);
      }
    });

    //confirm message dilivery
    socket.on("send_message", (message) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === message._id ? message : msg
        ),
      }));
    });

    //update message status
    socket.on("message_status_update", ({ messageId, messageStatus }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, messageStatus } : msg
        ),
      }));
    });

    //handle remove message from local state
    socket.on("message_deleted", ({ deletedMessageId }) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== deletedMessageId),
      }));
    });

    //handle any message sending error
    socket.on("message_error", (error) => {
      console.error("message_error", error); // Changed log to error
    });

    // Handle real-time updates for reactions, deleted messages, etc.
    socket.on("refetch_messages", ({ conversationId }) => {
      const { currentConversation, fetchMessages } = get();

      // Check: Conversation IDs must match explicitly as strings
      if (String(conversationId) === String(currentConversation)) {
        fetchMessages(currentConversation);
      }
    });

    //listner for typing users
    socket.on("user_typing", ({ userId, conversationId, isTyping }) => {
      set((state) => {
        const newTypingUsers = new Map(state.typingUsers);
        if (!newTypingUsers.has(conversationId)) {
          // Note: You should initialize this as a Set() for .add/.delete to work
          // Assuming you'll fix the implementation inside the component that consumes typingSet
          newTypingUsers.set(conversationId, new Set());
        }
        const typingSet = newTypingUsers.get(conversationId);

        // Ensure typingSet is a Set before using add/delete
        if (typingSet instanceof Set) {
          if (isTyping) {
            typingSet.add(userId);
          } else {
            typingSet.delete(userId);
          }
        }

        return { typingUsers: new Map(newTypingUsers) };
      });
    });

    //track user online/offline status
    socket.on("user_status", ({ userId, isOnline, lastSeen }) => {
      set((state) => {
        const newOnlineUsers = new Map(state.onlineUsers);
        newOnlineUsers.set(userId, { isOnline, lastSeen });
        return { onlineUsers: newOnlineUsers };
      });
    });

    //emit state check for all users in conversation list
    const { conversations } = get();
    if (conversations?.data?.length > 0) {
      conversations.data.forEach((conv) => {
        const otherUser = conv.participants.find(
          (p) => p._id !== get().currentUser?._id
        );

        if (otherUser?._id) {
          socket.emit("get_user_status", otherUser._id, (status) => {
            set((state) => {
              const newOnlineUsers = new Map(state.onlineUsers);
              newOnlineUsers.set(otherUser._id, {
                // Changed state.userId to otherUser._id
                isOnline: status.isOnline,
                lastSeen: status.lastSeen,
              });
              return { onlineUsers: newOnlineUsers };
            });
          });
        }
      });
    }
  },

  setCurrentUser: (user) => set({ currentUser: user }),

  fetchCoversations: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get(`/chat/conversations`);
      set({ conversations: data, loading: false });

      get().initsoketListeners();
      return data;
    } catch (error) {
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
      });
    }
    return null;
  },

  //fetch message for a conversation
  fetchMessages: async (conversationId) => {
    if (!conversationId) return null;

    set({ loading: true, error: null });

    try {
      // FIX KEPT: Cache-busting to ensure fresh data for real-time updates
      const cacheBuster = Date.now();
      const url = `/chat/conversations/${conversationId}?t=${cacheBuster}`;

      const { data } = await axiosInstance.get(url);

      const messageArray = data.data || data || [];

      // Preserve optimistic (temp) messages so they aren't lost during refetches
      const currentOptimistic = get().messages.filter(
        (m) => m && m._id && String(m._id).startsWith("temp-")
      );

      // Merge server messages with optimistic ones (avoid duplicates)
      const merged = [
        ...messageArray,
        ...currentOptimistic.filter(
          (opt) => !messageArray.some((srv) => srv._id === opt._id)
        ),
      ];

      // Set state
      set({
        messages: merged,
        currentConversation: conversationId,
        loading: false,
      });

      // FIX KEPT: Emit socket event to join the room on the server (Critical for receiving updates)
      const socket = getSocket();
      if (socket && conversationId) {
        socket.emit("join_conversation", conversationId);
      }

      // Mark users messages as read
      const { markMessagesAsRead } = get();
      markMessagesAsRead();

      return messageArray;
    } catch (error) {
      console.error("Error fetching messages:", error);
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
      });
    }
    return null;
  },

  //send message in real time
  sendMessage: async (formData, { onProgress, signal } = {}) => {
    const senderId = formData.get("senderId");
    const receiverId = formData.get("receiverId");
    const media = formData.get("media");
    const content = formData.get("content");
    const messageStatus = formData.get("messageStatus");

    const soket = getSocket();

    const { conversations } = get();
    let conversationId = null;

    if (conversations?.data?.length > 0) {
      const conversation = conversations.data.find(
        (conv) =>
          conv.participants.some((p) => p._id === senderId) &&
          conv.participants.some((p) => p._id === receiverId)
      );
      if (conversation) {
        conversationId = conversation._id;
        set({ currentConversation: conversationId });
      }
    }
    //temp message before sending actual response
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      sender: { _id: senderId },
      receiver: { _id: receiverId },
      conversation: conversationId,
      imageOrVideoUrl:
        media && typeof media !== "string" ? URL.createObjectURL(media) : null,
      content: content,
      contentType: media
        ? media.type.startsWith("image")
          ? "image"
          : media.type.startsWith("video")
          ? "video"
          : "document"
        : "text",
      documentName: media && typeof media !== "string" ? media.name : null,
      documentSize: media && typeof media !== "string" ? media.size : null,
      uploadProgress: media ? 0 : null,
      createdAt: new Date().toString(),
      messageStatus,
    };
    set((state) => ({
      messages: [...state.messages, optimisticMessage],
    }));

    try {
      const { data } = await axiosInstance.post(
        "/chat/send-message",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (!progressEvent) return;
            const total = progressEvent.total || progressEvent.loaded;
            const percentCompleted = total
              ? Math.round((progressEvent.loaded * 100) / total)
              : Math.round((progressEvent.loaded / 1000) * 100) / 100; // fallback

            // update optimistic message progress
            set((state) => ({
              messages: state.messages.map((msg) =>
                msg._id === tempId
                  ? { ...msg, uploadProgress: percentCompleted }
                  : msg
              ),
            }));

            // call external progress handler if provided
            if (typeof onProgress === "function") {
              try {
                onProgress(percentCompleted);
              } catch (e) {
                console.error("onProgress callback error", e);
              }
            }
          },
          // support AbortController signal for canceling uploads
          signal,
        }
      );
      const messageData = data.data || data;

      //replace optimstic message with actual message
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? messageData : msg
        ),
      }));
      return messageData;
    } catch (error) {
      console.error("failed to send message", error);
      set((state) => ({
        messages: state.messages.filter(
          (msg) =>
            // Fix: Correct logic to remove temp message on failure
            msg._id !== tempId
        ),
        error: error?.response?.data?.message || error?.message,
      }));
      // Original code had a bug here. Fixing the filter logic on failure.
      throw error;
    }
  },

  //recieve message
  recieveMessage: (message) => {
    if (!message) return;

    const { currentConversation, currentUser } = get();

    // Fix: deduplicate messages using server _id OR clientTempId
    const stateMessages = get().messages || [];

    // If server message has clientTempId and a matching optimistic message exists, replace it
    if (message.clientTempId) {
      const tempIndex = stateMessages.findIndex(
        (m) => m._id === message.clientTempId
      );
      if (tempIndex > -1) {
        set((state) => {
          const newMessages = [...state.messages];
          newMessages[tempIndex] = message;
          return { messages: newMessages };
        });

        //automatically mark as read if appropriate
        if (message?.receiver?._id === currentUser?._id) {
          get().markMessagesAsRead();
        }
        // update conversation preview & exit early
      } else {
        // no temp match found; fall through to normal add below
      }
      // proceed to update conversations/unread whether replaced or not
    } else {
      // Normal dedupe by server _id
      const messageExist = stateMessages.some((msg) => msg._id === message._id);
      if (messageExist) return;

      if (message.conversation === currentConversation) {
        set((state) => ({
          messages: [...state.messages, message],
        }));

        //automatically mark as read
        if (message?.receiver?._id === currentUser?._id) {
          get().markMessagesAsRead();
        }
      }
    }

    //upadate conversation preview & unread count
    set((state) => {
      const updateConversations = state.conversations.data.map((conv) => {
        if (conv._id === message.conversation) {
          return {
            ...conv,
            latestMessage: message,
            unreadCount:
              message?.receiver?._id === currentUser?._id
                ? (conv.unreadCount || 0) + 1
                : conv.unreadCount || 0,
          };
        }
        return conv;
      });

      return {
        conversations: {
          ...state.conversations,
          data: updateConversations,
        },
      };
    });
  },

  //mark as read
  markMessagesAsRead: async () => {
    const { messages, currentUser } = get();

    if (!messages?.length || !currentUser) return;
    const unreadIds = messages
      .filter(
        (msg) =>
          msg.messageStatus !== "read" && msg.receiver?._id === currentUser?._id
      )
      .map((msg) => msg._id)
      .filter(Boolean);

    if (unreadIds.length === 0) return;

    try {
      const { data } = await axiosInstance.put("/chat/message/read", {
        messageIds: unreadIds,
      });
      console.log("message mark as read", data);
      set((state) => ({
        messages: state.messages.map((msg) =>
          unreadIds.includes(msg._id) ? { ...msg, messageStatus: "read" } : msg
        ),
      }));
      const soket = getSocket();
      if (soket) {
        soket.emit("message_read", {
          messageIds: unreadIds,
          senderId: messages[0].sender?._id,
        });
      }
    } catch (error) {
      console.error("Error in marking messages as read:", error);
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/chat/message/${messageId}`);

      set((state) => ({
        messages: state.messages?.filter((msg) => msg?._id !== messageId),
      }));
    } catch (error) {
      console.error("Error in deleting message:", error);
      set({ error: error?.response?.data?.message || error?.message });
      return false;
    }
  },

  // Add or change reactions
  addReaction: async (messageId, emoji) => {
    const socket = getSocket();
    if (!socket) {
      console.error("Socket not connected, cannot add reaction.");
      return;
    }

    const currentUser = get().currentUser;
    const currentConversationId = get().currentConversation;

    try {
      // Optimistically update local message reactions so UI responds instantly
      set((state) => ({
        messages: state.messages.map((msg) => {
          if (msg._id !== messageId) return msg;

          // clone reactions array
          const reactions = Array.isArray(msg.reactions)
            ? [...msg.reactions]
            : [];

          // check for existing reaction by current user
          const existingIndex = reactions.findIndex(
            (r) => r && r.user && String(r.user._id) === String(currentUser._id)
          );

          if (existingIndex > -1) {
            // toggle off if same emoji, otherwise replace
            if (reactions[existingIndex].emoji === emoji) {
              reactions.splice(existingIndex, 1);
            } else {
              reactions[existingIndex] = {
                ...reactions[existingIndex],
                emoji,
              };
            }
          } else {
            // push a temporary reaction object
            reactions.push({
              _id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              user: {
                _id: currentUser._id,
                userName: currentUser.userName,
                profilePicture: currentUser.profilePicture,
              },
              emoji,
            });
          }

          return { ...msg, reactions };
        }),
      }));

      // Emit to server to persist the reaction; server will emit refetch_messages to sync
      socket.emit("add_reaction", {
        messageId,
        emoji,
        conversationId: currentConversationId,
        reactorId: currentUser._id,
      });
    } catch (error) {
      console.error("Failed to emit reaction socket event:", error);
    }
  },

  startTyping: (receiverId) => {
    const { currentConversation } = get();
    const soket = getSocket();
    if (soket && currentConversation && receiverId) {
      soket.emit("typing_start", {
        receiverId,
        conversationId: currentConversation,
      });
    }
  },
  stopTyping: (receiverId) => {
    const soket = getSocket();
    const { currentConversation } = get();
    if (soket && currentConversation && receiverId) {
      soket.emit("typing_stop", {
        receiverId,
        conversationId: currentConversation,
      });
    }
  },

  isUserTyping: (userId) => {
    const { typingUsers, currentConversation } = get();
    if (
      !currentConversation ||
      !typingUsers.has(currentConversation) ||
      !userId
    ) {
      return false;
    }
    // Assuming typingUsers.get(currentConversation) is a Set
    return typingUsers.get(currentConversation).has(userId);
  },

  isUserOnline: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.isOnline || false;
  },
  getUserlastSeen: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.lastSeen || null;
  },

  cleanup: () => {
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      loading: false,
      error: null,
      onlineUsers: new Map(),
      typingUsers: new Map(),
    });
  },
}));
