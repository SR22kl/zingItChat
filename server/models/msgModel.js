import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String },
    imageOrVideoUrl: { type: String },
    contentType: {
      type: String,
      enum: ["text", "image", "video", "document"],
      default: "text",
    },
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      },
    ],
    messageStatus: {
      type: String,
      default: "send",
    },
  },
  { timestamps: true }
);

// Ensure at least one of `content` or `imageOrVideoUrl` is present
messageSchema.pre("validate", function (next) {
  if (!this.content && !this.imageOrVideoUrl) {
    const err = new Error("Either content or imageOrVideoUrl is required");
    return next(err);
  }
  next();
});
const Message = mongoose.model("Message", messageSchema);

export default Message;
