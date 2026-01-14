import { uploadFileToCloudinary } from "../config/cloudinaryConfig.js";
import Conversation from "../models/convoModel.js";
import Message from "../models/msgModel.js";
import response from "../utils/resHandler.js";

export const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, messageStatus, clientTempId } =
      req.body;
    const file = req.file;

    const participants = [senderId, receiverId].sort();

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: participants,
    });
    if (!conversation) {
      conversation = new Conversation({ participants });
      await conversation.save();
    }
    let imageOrVideoUrl = null;
    let contentType = null;

    // Handle file upload (images, videos, documents/raw)
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 500, "Failed to upload media file");
      }

      imageOrVideoUrl = uploadFile.secure_url;

      if (file.mimetype.startsWith("image")) {
        contentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        contentType = "video";
      } else {
        // Treat other mime types (pdf, docx, txt, etc.) as documents
        contentType = "document";
      }
    } else if (content?.trim()) {
      contentType = "text";
    } else {
      return response(res, 400, "Message content or media file is required");
    }

    // Create message object
    const message = new Message({
      conversation: conversation?._id,
      sender: senderId,
      receiver: receiverId,
      content,
      imageOrVideoUrl,
      contentType,
      messageStatus,
    });

    await message.save();

    if (message?.content) {
      conversation.lastMessage = message?._id;
    }
    conversation.unreadCount = +1;
    await conversation.save();

    const populatedMessageDoc = await Message.findOne(message?._id)
      .populate("sender", "userName profilePicture")
      .populate("receiver", "userName profilePicture");
    const populatedMessage = {
      ...populatedMessageDoc.toObject(),
      clientTempId: clientTempId || null,
    };

    // Emit socket event for real-time message delivery
    if (req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap.get(receiverId);
      const senderSocketId = req.socketUserMap.get(senderId);

      // Emit to the conversation room for real-time delivery but exclude the sender
      // The sender already receives the persisted message via the HTTP response
      try {
        if (senderSocketId) {
          // Use `in(...).except(...)` to avoid sending the room event back to sender
          req.io
            .in(conversation._id.toString())
            .except(senderSocketId)
            .emit("new_message", populatedMessage);
        } else {
          req.io
            .in(conversation._id.toString())
            .emit("new_message", populatedMessage);
        }
      } catch (e) {
        // Fallback: emit to room (older socket.io versions may not support except)
        req.io
          .to(conversation._id.toString())
          .emit("new_message", populatedMessage);
      }

      // If receiver is directly connected (and not part of the room), ensure they get notified
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("new_message", populatedMessage);
        message.messageStatus = "delivered";
        await message.save();
      }
    }

    return response(res, 201, "Message sent successfully", populatedMessage);
  } catch (error) {
    console.error("Error in sending message:", error);
    return response(res, 500, "Internal Server Error");
  }
};

// get all conversations
export const getConversations = async (req, res) => {
  const userId = req.user.userId;
  try {
    let conversations = await Conversation.find({ participants: userId })
      .populate("participants", "userName isOnline profilePicture lastSeen")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender receiver",
          select: "userName profilePicture",
        },
      })
      .sort({ updatedAt: -1 });

    return response(
      res,
      200,
      "Conversations fetched successfully",
      conversations
    );
  } catch (error) {
    console.error("Error in fetching conversations:", error);
    return response(res, 500, "Internal Server Error");
  }
};

export const getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.userId;

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      return response(
        res,
        404,
        "Conversation not found or you are not a participant"
      );
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "userName profilePicture")
      .populate("receiver", "userName profilePicture")
      .populate({
        path: "reactions.user",
        select: "userName profilePicture",
      })
      .sort({ createdAt: 1 });

    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        messageStatus: { $in: ["send", "delivered"] },
      },
      {
        $set: { messageStatus: "read" },
      }
    );

    conversation.unreadCount = 0;
    await conversation.save();

    return response(res, 200, "Messages fetched successfully", messages);
  } catch (error) {
    console.error("Error in fetching messages:", error);
    return response(res, 500, "Internal Server Error");
  }
};

export const markAsRead = async (req, res) => {
  const { messageIds } = req.body;
  const userId = req.user.userId;

  try {
    // get relevant messages to determine conversation
    let messages = await Message.find({
      _id: { $in: messageIds },
      receiver: userId,
    });

    await Message.updateMany(
      {
        _id: { $in: messageIds },
        receiver: userId,
      },
      {
        $set: { messageStatus: "read" },
      }
    );

    //notify to original sender via socket
    if (req.io && req.socketUserMap) {
      for (const message of messages) {
        const senderSocketId = req.socketUserMap.get(message.sender.toString());
        if (senderSocketId) {
          const updatedMessage = {
            _id: message._id,
            messageStatus: "read",
          };
          req.io.to(senderSocketId).emit("message_read", updatedMessage);
          await message.save();
        }
      }
    }

    return response(res, 200, "Messages marked as read successfully", messages);
  } catch (error) {
    console.error("Error in marking messages as read:", error);
    return response(res, 500, "Internal Server Error");
  }
};

export const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.userId;

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return response(res, 404, "Messages not found");
    }
    if (message.sender.toString() !== userId) {
      return response(
        res,
        403,
        "You are not authorized to delete this message"
      );
    }

    await message.deleteOne();

    //Emit socket event to notify deletion
    if (req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap.get(
        message.receiver.toString()
      );
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("message_deleted", messageId);
      }
    }
    return response(res, 200, "Message deleted successfully");
  } catch (error) {
    console.error("Error in deleting messages:", error);
    return response(res, 500, "Internal Server Error");
  }
};
