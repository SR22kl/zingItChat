import { create } from "zustand";
import { getSocket } from "../services/chatService";
import axiosInstance from "../services/urlServices";

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  currentUser: null,
  onlineUsers: new Map(),
  typingUsers: new Map(),

  initsoketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    // Ensure server knows this user's socket id for direct emits
    const currentUser = get().currentUser;
    try {
      if (
        currentUser &&
        currentUser._id &&
        socket &&
        typeof socket.emit === "function"
      ) {
        socket.emit("user_connected", currentUser._id);
      }
      // Re-emit on reconnect to ensure mapping after network blips
      socket.off("connect");
      socket.on("connect", () => {
        const u = get().currentUser;
        if (u && u._id) {
          socket.emit("user_connected", u._id);
        }
      });
    } catch (e) {
      console.error("initsoketListeners: failed to emit user_connected", e);
    }

    socket.off("send_message");
    socket.off("receive_message");
    socket.off("new_message");
    socket.off("user_typing");
    socket.off("user_status");
    socket.off("message_error");
    socket.off("message_deleted");
    socket.off("refetch_messages");
    socket.off("message_status_update");

    socket.on("receive_message", (message) => {
      try {
        console.debug("socket: receive_message", message);
        get().recieveMessage(message);
      } catch (e) {
        console.error("Error handling receive_message", e);
      }
    });

    socket.on("new_message", (message) => {
      try {
        console.debug("socket: new_message", message);
        get().recieveMessage(message);
      } catch (e) {
        console.error("Error handling new_message", e);
      }
    });

    socket.on("send_message", (message) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === message._id ? message : msg
        ),
      }));
    });

    socket.on("message_status_update", ({ messageId, messageStatus }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, messageStatus } : msg
        ),
      }));
    });

    socket.on("message_deleted", ({ deletedMessageId }) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== deletedMessageId),
      }));
    });

    socket.on("message_error", (error) => {
      console.error("message_error", error);
    });

    socket.on("refetch_messages", ({ conversationId }) => {
      const { currentConversation } = get();
      if (String(conversationId) === String(currentConversation)) {
        get().fetchMessages(currentConversation);
      }
    });

    socket.on("user_typing", ({ userId, conversationId, isTyping }) => {
      set((state) => {
        const newTypingUsers = new Map(state.typingUsers);
        if (!newTypingUsers.has(conversationId)) {
          newTypingUsers.set(conversationId, new Set());
        }
        const typingSet = newTypingUsers.get(conversationId);
        if (typingSet instanceof Set) {
          if (isTyping) typingSet.add(userId);
          else typingSet.delete(userId);
        }
        return { typingUsers: new Map(newTypingUsers) };
      });
    });

    socket.on("user_status", ({ userId, isOnline, lastSeen }) => {
      set((state) => {
        const newOnlineUsers = new Map(state.onlineUsers);
        newOnlineUsers.set(userId, { isOnline, lastSeen });
        return { onlineUsers: newOnlineUsers };
      });
    });

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
                isOnline: status?.isOnline,
                lastSeen: status?.lastSeen,
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

  fetchMessages: async (conversationId) => {
    if (!conversationId) return null;

    set({ loading: true, error: null });

    try {
      const cacheBuster = Date.now();
      const url = `/chat/conversations/${conversationId}?t=${cacheBuster}`;

      const { data } = await axiosInstance.get(url);

      const messageArray = data.data || data || [];

      const currentOptimistic = (get().messages || []).filter(
        (m) => m && m._id && String(m._id).startsWith("temp-")
      );

      const merged = [
        ...messageArray,
        ...currentOptimistic.filter(
          (opt) => !messageArray.some((srv) => srv._id === opt._id)
        ),
      ];

      set({
        messages: merged,
        currentConversation: conversationId,
        loading: false,
      });

      const socket = getSocket();
      if (socket && conversationId)
        socket.emit("join_conversation", conversationId);

      get().markMessagesAsRead();

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

  sendMessage: async (formData, { onProgress, signal } = {}) => {
    const senderId = formData.get("senderId");
    const receiverId = formData.get("receiverId");
    const media = formData.get("media");
    const content = formData.get("content");
    const messageStatus = formData.get("messageStatus");

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
        ? media.type?.startsWith("image")
          ? "image"
          : media.type?.startsWith("video")
          ? "video"
          : "document"
        : "text",
      documentName: media && typeof media !== "string" ? media.name : null,
      documentSize: media && typeof media !== "string" ? media.size : null,
      uploadProgress: media ? 0 : null,
      createdAt: new Date().toString(),
      messageStatus,
    };

    set((state) => ({ messages: [...state.messages, optimisticMessage] }));
    try {
      if (formData && typeof formData.append === "function") {
        formData.append("clientTempId", tempId);
        console.debug("sendMessage DEBUG: appended clientTempId to formData", {
          tempId,
        });
      }
    } catch (e) {
      console.error("Failed to append clientTempId to formData", e);
    }

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
              : Math.round((progressEvent.loaded / 1000) * 100) / 100;

            set((state) => ({
              messages: state.messages.map((msg) =>
                msg._id === tempId
                  ? { ...msg, uploadProgress: percentCompleted }
                  : msg
              ),
            }));

            if (typeof onProgress === "function") {
              try {
                onProgress(percentCompleted);
              } catch (e) {
                console.error("onProgress callback error", e);
              }
            }
          },
          signal,
        }
      );
      const messageData = data.data || data;

      set((state) => {
        // Replace optimistic temp message with server message and dedupe duplicates
        const replaced = state.messages.map((msg) =>
          msg._id === tempId ? messageData : msg
        );
        const deduped = [];
        for (const m of replaced) {
          if (!m || !m._id) continue;
          if (!deduped.find((x) => x._id === m._id)) deduped.push(m);
        }
        return { messages: deduped };
      });
      return messageData;
    } catch (error) {
      console.error("failed to send message", error);
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== tempId),
        error: error?.response?.data?.message || error?.message,
      }));
      throw error;
    }
  },

  recieveMessage: (message) => {
    if (!message) return;

    const { currentConversation, currentUser } = get();
    const stateMessages = get().messages || [];

    try {
      console.debug("recieveMessage DEBUG: incoming", {
        messageId: message._id,
        clientTempId: message.clientTempId,
      });
    } catch (e) {}

    let replacedOptimistic = false;
    if (message.clientTempId) {
      const tempIndex = stateMessages.findIndex(
        (m) => m._id === message.clientTempId
      );
      if (tempIndex > -1) {
        set((state) => {
          const newMessages = [...state.messages];
          newMessages[tempIndex] = message;
          // dedupe after replacement
          const deduped = [];
          for (const m of newMessages) {
            if (!m || !m._id) continue;
            if (!deduped.find((x) => x._id === m._id)) deduped.push(m);
          }
          return { messages: deduped };
        });
        replacedOptimistic = true;
        // refresh local snapshot
        stateMessages = get().messages || [];
        if (message?.receiver?._id === currentUser?._id) {
          get().markMessagesAsRead();
        }
      }
    }

    // Re-read current messages from state to avoid stale checks
    stateMessages = get().messages || [];

    // If server id already exists, ignore duplicate
    if (stateMessages.some((m) => m._id === message._id)) return;

    if (
      !replacedOptimistic &&
      String(message.conversation) === String(currentConversation)
    ) {
      set((state) => ({ messages: [...state.messages, message] }));
      if (message?.receiver?._id === currentUser?._id)
        get().markMessagesAsRead();
    }

    set((state) => {
      const convs = state.conversations?.data || [];
      const updateConversations = convs.map((conv) => {
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
        conversations: { ...state.conversations, data: updateConversations },
      };
    });
  },

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
      const socket = getSocket();
      if (socket)
        socket.emit("message_read", {
          messageIds: unreadIds,
          senderId: messages[0].sender?._id,
        });
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

  addReaction: async (messageId, emoji) => {
    const socket = getSocket();
    if (!socket) {
      console.error("Socket not connected, cannot add reaction.");
      return;
    }

    const currentUser = get().currentUser;
    const currentConversationId = get().currentConversation;

    try {
      set((state) => ({
        messages: state.messages.map((msg) => {
          if (msg._id !== messageId) return msg;
          const reactions = Array.isArray(msg.reactions)
            ? [...msg.reactions]
            : [];
          const existingIndex = reactions.findIndex(
            (r) => r && r.user && String(r.user._id) === String(currentUser._id)
          );
          if (existingIndex > -1) {
            if (reactions[existingIndex].emoji === emoji)
              reactions.splice(existingIndex, 1);
            else
              reactions[existingIndex] = { ...reactions[existingIndex], emoji };
          } else {
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
    )
      return false;
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

export default useChatStore;
