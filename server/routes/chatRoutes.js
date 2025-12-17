import express from "express";
import {
  deleteMessage,
  getConversations,
  getMessages,
  markAsRead,
  sendMessage,
} from "../controllers/chatController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { multerMiddleware } from "../config/cloudinaryConfig.js";

const chatRouter = express.Router();

// Route to send a message - /api/chat/send-message
chatRouter.post("/send-message", authMiddleware, multerMiddleware, sendMessage);

// Route to get all conversations - /api/chat/conversations
chatRouter.get("/conversations", authMiddleware, getConversations);

// Route to get messages for a conversation - /api/chat/conversations/messages/:conversationId
chatRouter.get(
  "/conversations/:conversationId",
  authMiddleware,
  getMessages
);

// Route to mark messages as read - /api/chat/message/read
chatRouter.put("/message/read", authMiddleware, markAsRead);

// Route to delete a message - /api/chat/message/:messageId
chatRouter.delete("/message/:messageId", authMiddleware, deleteMessage);

export default chatRouter;
