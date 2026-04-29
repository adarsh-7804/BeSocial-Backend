const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    isGroup: {
      type: Boolean,
      default: false,
    },
    groupName: {
      type: String,
      default: "",
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    groupProfilePic: {
      type: String,
      default: "",
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    muteBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isMuted: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
        },
        mutedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isArchived: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
        },
        archivedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    pinnedMessage: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
    pinnedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  },
);

conversationSchema.index({ participants: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);
module.exports = Conversation;
