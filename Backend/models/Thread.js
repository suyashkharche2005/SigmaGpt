import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const threadSchema = new mongoose.Schema(
  {
    threadId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      default: "New Chat",
      trim: true
    },
    pinned: {
      type: Boolean,
      default: false
    },
    messages: {
      type: [messageSchema],
      default: []
    }
  },
  { timestamps: true }
);

export default mongoose.model("Thread", threadSchema);