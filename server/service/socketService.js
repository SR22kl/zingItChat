import { Server } from "socket.io";
import User from "../models/userModel.js";
import Message from "../models/msgModel.js";
import handleVideoCallEvent from "./videocallEvents.js";
import socketMiddleware from "../middleware/socketMiddleware.js";

// Map to store online users -> userId, socketId
const onlineUsers = new Map();

// Map to check typing users -> userId -> [conversation]: boolean
const typingUsers = new Map();

export const initailizeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
    pingTimeout: 60000, // Disconnect inactive users after 60 seconds
  });

  //middleware
  io.use(socketMiddleware);

  //when a new socket connection is established
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    let userId = null;

    //Handle user connections & mark them online in DB
    socket.on("user_connected", async (connectingUserId) => {
      try {
        userId = connectingUserId;
        socket.userId = userId;
        onlineUsers.set(userId, socket.id);
        socket.join(userId); //join a room with userId

        //update user isOnline status in DB
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: new Date(),
        });

        //notify all users about this user's online status
        io.emit("user_status", {
          userId,
          isOnline: true,
          lastSeen: new Date(),
        });
      } catch (error) {
        console.error("Error in handling user connection:", error);
      }
    });

    //Return online status of requested users
    socket.on("get_user_status", async (requestedUserId, callback) => {
      const isOnline = onlineUsers.has(requestedUserId);
      let lastSeen = null;

      if (isOnline) {
        lastSeen = new Date();
      } else {
        // Get lastSeen from database for offline users
        try {
          const user = await User.findById(requestedUserId).select("lastSeen");
          lastSeen = user?.lastSeen || null;
        } catch (error) {
          console.error("Error fetching user lastSeen:", error);
        }
      }

      callback({
        userId: requestedUserId,
        isOnline,
        lastSeen,
      });
    });

    // Reciever gets message when he is online
    socket.on("send_message", async (message) => {
      try {
        const receiverSocketId = onlineUsers.get(message.receiver?._id);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive_message", message);
        }
      } catch (error) {
        console.error("Error in sending message:", error);
        socket.emit("message_error", { error: "Failed to send message." });
      }
    });

    // update message as read & notify sender
    socket.on("message_read", async ({ messageIds, senderId }) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $set: { messageStatus: "read" } }
        );
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          messageIds.forEach((messageId) => {
            io.to(senderSocketId).emit("message_status_update", {
              messageId,
              messageStatus: "read",
            });
          });
        }
      } catch (error) {
        console.error("Error in updating message status:", error);
        socket.emit("message_error", {
          error: "Failed to update message status.",
        });
      }
    });

    // handle user typing indicator event
    socket.on("typing_start", ({ conversationId, receiverId }) => {
      if (!typingUsers.has(userId)) {
        typingUsers.set(userId, {});
      }

      const userTyping = typingUsers.get(userId);
      userTyping[conversationId] = true;

      // clear existing timeout
      if (userTyping[`${conversationId}_timeout`]) {
        clearTimeout(userTyping[`${conversationId}_timeout`]);
      }

      //auto stop after 5 seconds of inactivity
      userTyping[`${conversationId}_timeout`] = setTimeout(() => {
        userTyping[conversationId] = false;
        socket.to(receiverId).emit("user_typing", {
          userId,
          conversationId,
          isTyping: false,
        });
      }, 5000);

      //notify receiver
      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: true,
      });
    });

    socket.on("typing_stop", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;

      if (typingUsers.has(userId)) {
        const userTyping = typingUsers.get(userId);
        userTyping[conversationId] = false;

        if (userTyping[`${conversationId}_timeout`]) {
          clearTimeout(userTyping[`${conversationId}_timeout`]);
          delete userTyping[`${conversationId}_timeout`];
        }
      }
      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: false,
      });
    });

    socket.on(
      "add_reaction",
      async ({ messageId, emoji, reactorId, conversationId }) => {
        let message = await Message.findById(messageId);

        if (!message) return; // Handle message not found

        const existingReactionIndex = message.reactions.findIndex(
          (r) => r && r.user && r.user.toString() === reactorId.toString()
        );

        if (existingReactionIndex > -1) {
          const existingEmoji = message.reactions[existingReactionIndex].emoji;

          if (existingEmoji === emoji) {
            message.reactions.splice(existingReactionIndex, 1);
          } else {
            message.reactions[existingReactionIndex].emoji = emoji;
          }
        } else {
          const newReaction = {
            emoji: emoji,
            user: reactorId,
          };
          message.reactions.push(newReaction);
        }

        const updatedMessage = await message.save();

        io.to(conversationId).emit("refetch_messages", { conversationId });
      }
    );

    socket.on("join_conversation", (conversationId) => {
      console.log(
        `SERVER: Socket ${socket.id} joining room: ${conversationId}`
      );
      socket.join(conversationId);
    });

    //handle videocall events
    handleVideoCallEvent(socket, io, onlineUsers);

    // handle user disconnection and mark them offline in DB
    const handleDisconnected = async () => {
      if (!userId) return;

      try {
        onlineUsers.delete(userId);

        // clear all typing timeouts
        if (typingUsers.has(userId)) {
          const userTyping = typingUsers.get(userId);
          Object.keys(userTyping).forEach((key) => {
            if (key.endsWith("_timeout")) {
              clearTimeout(userTyping[key]);
            }
          });
          typingUsers.delete(userId);
        }

        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
        io.emit("user_status", {
          userId,
          isOnline: false,
          lastSeen: new Date(),
        });
        socket.leave(userId);
        console.log(`User: ${socket.id} disconnected`);
      } catch (error) {
        console.error("Error in handling user disconnection:", error);
      }
    };

    //disconnect event
    socket.on("disconnect", handleDisconnected);
  });

  //attach the online user map to the socket server for external user
  io.socketUserMap = onlineUsers;

  return io;
};

export default initailizeSocket;
