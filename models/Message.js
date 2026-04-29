const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // required: true,
    },
    content: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "audio", "file", "emoji"],
      default: "text",
    },
    mediaUrl: {
      type: String,
      default: "",
    },
    mediaName: String,
    mediaSize: Number,

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    replyToStory: {
      storyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
        default: null,
      },

      type: {
        type: String,
        enum: ["image", "video", "text"],
        default: "text",
      },

      mediaUrl: {
        type: String,
        default: "",
      },

      textContent: {
        type: String,
        default: "",
      },

      storyOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deleteFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    isForwarded: {
      type: Boolean,
      default: false,
    },
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
