const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Who receives this notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["tag_in_post", "mention_in_post", "like_post", "comment_post", "friend_request_accepted", "message", "new_follower", "reply_comment", "share_post", "security_alert"],
      required: true,
    },

   
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },

    // For message notifications
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },

    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Short human-readable message shown in UI
    message: {
      type: String,
      required: true,
    },

    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast per-user queries, newest first
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model("Notification", notificationSchema);