import { uploadFileToCloudinary } from "../config/cloudinaryConfig.js";
import Status from "../models/statusModel.js";
import response from "../utils/resHandler.js";

export const createStatus = async (req, res) => {
  try {
    const { content, contentType } = req.body;
    const userId = req.user.userId;
    const file = req.file;

    let mediaUrl = null;
    let finalContentType = contentType || "text";

    //handle file upload
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 500, "Failed to upload media file");
      }

      mediaUrl = uploadFile?.secure_url;

      if (file.mimetype.startsWith("image")) {
        finalContentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        finalContentType = "video";
      } else {
        return response(res, 400, "Unsupported file type");
      }
    } else if (content?.trim()) {
      finalContentType = "text";
    } else {
      return response(res, 400, "Message content or media file is required");
    }

    const expireAt = new Date();
    expireAt.setHours(expireAt.getHours() + 24); // Set expiration time to 24 hours from now

    const status = new Status({
      user: userId,
      // store caption/text in `content`, media url in `media` for images/videos
      content: content || (finalContentType === "text" ? mediaUrl : ""),
      media: mediaUrl || null,
      contentType: finalContentType,
      expiresAt: expireAt,
    });
    await status.save();

    const populatedStatus = await Status.findById(status?._id)
      .populate("user", "userName profilePicture")
      .populate("viewers", "userName profilePicture");

    //Exit Socket Event
    if (req.io && req.socketUserMap) {
      //Boradcast to all connected clients except the creator
      for (const [connectingUserId, socketId] of req.socketUserMap) {
        if (connectingUserId !== userId) {
          req.io.to(socketId).emit("new_status", populatedStatus);
        }
      }
    }

    return response(res, 201, "Status created successfully", populatedStatus);
  } catch (error) {
    console.error("Error creating status:", error);
    return response(res, 500, "Internal server error");
  }
};

export const getStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "userName profilePicture")
      .populate("viewers", "userName profilePicture")
      .sort({ createdAt: -1 });

    return response(res, 200, "Statuses fetched successfully", statuses);
  } catch (error) {
    console.error("Error fetching statuses:", error);
    return response(res, 500, "Internal server error");
  }
};

export const viewStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }

    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId);
      await status.save();

      const updatedStatus = await Status.findById(statusId)
        .populate("user", "userName profilePicture")
        .populate("viewers", "userName profilePicture");

      // Emit socket event to status owner about new viewer
      if (req.io && req.socketUserMap) {
        // Broadcast to all connected clients except the creator
        const statusOwnerSocketId = req.socketUserMap.get(
          status.user._id.toString()
        );
        if (statusOwnerSocketId) {
          const viewData = {
            statusId,
            viewerId: userId,
            totalViewers: updatedStatus.viewers.length,
            viewers: updatedStatus.viewers,
          };
          req.io.to(statusOwnerSocketId).emit("status_viewed", viewData);
        } else {
          console.log("Status owner is not connected via socket");
        }
      }
    } else {
      console.log("user already viewed the status");
    }

    return response(res, 200, "Status viewed successfully");
  } catch (error) {
    console.error("Error viewing status:", error);
    return response(res, 500, "Internal server error");
  }
};

export const deleteStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    } else if (status.user.toString() !== userId) {
      return response(res, 403, "You are not authorized to delete this status");
    }
    await status.deleteOne();

    // Emit socket event to status owner about new viewer
    if (req.io && req.socketUserMap) {
      for (const [connectingUserId, socketId] of req.socketUserMap) {
        if (connectingUserId !== userId) {
          req.io.to(socketId).emit("status_deleted", statusId);
        }
      }
    }
    return response(res, 200, "Status deleted successfully");
  } catch (error) {
    console.error("Error in deleting status:", error);
    return response(res, 500, "Internal Server Error");
  }
};
