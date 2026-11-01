import mongoose from "mongoose";

const AttachmentRefSchema = new mongoose.Schema(
  {
    attachmentId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    kind: {
      type: String,
      enum: ["image", "file"],
      required: true,
    },
    mimeType: String,
    size: Number,
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    attachments: {
      type: [AttachmentRefSchema],
      default: [],
    },
  },
  { timestamps: { createdAt: "timestamp", updatedAt: false } }
);

const ThreadSchema = new mongoose.Schema(
  {
    threadId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String, 
      default: null,
    },
    title: {
      type: String,
      default: "New Chat",
      trim: true,
      maxlength: 100,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    messages: [MessageSchema],
  },
  { timestamps: true } 
);

ThreadSchema.index({ userId: 1, pinned: -1, updatedAt: -1 });

export default mongoose.model("Thread", ThreadSchema);