const Notification = require("../models/Notification");
const Conversation = require("../models/Conversation");
const User = require("../models/user");

async function createMessageNotification(req, res) {
  try {
    const { senderId, recipientId, conversationId, messageId, content } = req.body;

    if (!senderId || !recipientId || !conversationId || !messageId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if the conversation is muted for this user
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isMuted = conversation.isMuted.some(
      (mute) => mute.userId.toString() === recipientId.toString()
    );

    // Don't create notification if muted
    if (isMuted) {
      return res.status(200).json({ message: "Notification skipped (conversation muted)" });
    }

    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type: "message",
      conversation: conversationId,
      messageId: messageId,
      message: content || "New message",
      read: false,
    });

    const populated = await notification.populate([
      { path: "sender", select: "firstName lastName avatar" },
      { path: "conversation", select: "groupName isGroup" },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getNotifications(req, res) {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate("sender", "firstName lastName avatar")
      .populate("post", "_id caption ")
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getMessageNotifications(req, res) {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id,
      type: "message",
    })
      .populate("sender", "firstName lastName avatar")
      .populate("conversation", "groupName isGroup")
      .sort({ createdAt: -1 })
      .limit(20);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      type: "message",
      read: false,
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function markAsRead(req, res) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ notification });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function markAllRead(req, res) {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function deleteNotification(req, res) {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    res.json({ message: "Notification deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function createLikeNotification(recipientId, senderId, postId) {
  try {
    if (recipientId.toString() === senderId.toString()) return; // Don't notify self

    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type: "like_post",
      post: postId,
      message: "Liked your post",
      read: false,
    });

    const populated = await notification.populate([
      { path: "sender", select: "firstName lastName avatar" },
      { path: "post", select: "_id caption" },
    ]);

    return populated;
  } catch (err) {
    console.error("Error creating like notification:", err.message);
  }
}

async function createCommentNotification(recipientId, senderId, postId, commentContent) {
  try {
    if (recipientId.toString() === senderId.toString()) return;

    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type: "comment_post",
      post: postId,
      message: `Commented: "${commentContent.substring(0, 30)}..."`,
      read: false,
    });

    const populated = await notification.populate([
      { path: "sender", select: "firstName lastName avatar" },
      { path: "post", select: "_id caption" },
    ]);

    return populated;
  } catch (err) {
    console.error("Error creating comment notification:", err.message);
  }
}

async function createMentionNotification(recipientId, senderId, postId, mentionType = "post") {
  try {
    if (recipientId.toString() === senderId.toString()) return;

    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type: "mention_in_post",
      post: postId,
      message: `Mentioned you in a ${mentionType}`,
      read: false,
    });

    const populated = await notification.populate([
      { path: "sender", select: "firstName lastName avatar" },
      { path: "post", select: "_id caption" },
    ]);

    return populated;
  } catch (err) {
    console.error("Error creating mention notification:", err.message);
  }
}

async function createReplyNotification(recipientId, senderId, postId, replyContent) {
  try {
    if (recipientId.toString() === senderId.toString()) return;

    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type: "reply_comment",
      post: postId,
      message: `Replied: "${replyContent.substring(0, 30)}..."`,
      read: false,
    });

    const populated = await notification.populate([
      { path: "sender", select: "firstName lastName avatar" },
      { path: "post", select: "_id caption" },
    ]);

    return populated;
  } catch (err) {
    console.error("Error creating reply notification:", err.message);
  }
}

async function createShareNotification(recipientId, senderId, postId) {
  try {
    if (recipientId.toString() === senderId.toString()) return;

    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type: "share_post",
      post: postId,
      message: "Shared your post",
      read: false,
    });

    const populated = await notification.populate([
      { path: "sender", select: "firstName lastName avatar" },
      { path: "post", select: "_id caption" },
    ]);

    return populated;
  } catch (err) {
    console.error("Error creating share notification:", err.message);
  }
}

async function createFollowerNotification(recipientId, senderId) {
  try {
    if (recipientId.toString() === senderId.toString()) return;

    const existingNotif = await Notification.findOne({
      recipient: recipientId,
      sender: senderId,
      type: "new_follower",
    });

    if (existingNotif) return existingNotif;

    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type: "new_follower",
      message: "Started following you",
      read: false,
    });

    const populated = await notification.populate(
      { path: "sender", select: "firstName lastName avatar" }
    );

    return populated;
  } catch (err) {
    console.error("Error creating follower notification:", err.message);
  }
}

async function createSecurityAlertNotification(recipientId, senderId, metadata = {}) {
  try {
    const details = [];

  

    const message = details.length
      ? `New login detected (${details.join(", ")})`
      : "New login detected, If not you?Than change your Password.";

    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type: "security_alert",
      message,
      read: false,
    });

    const populated = await notification.populate([
      { path: "sender", select: "firstName lastName avatar" },
    ]);

    return populated;
  } catch (err) {
    console.error("Error creating security alert notification:", err.message);
  }
}

async function getNotificationsByType(req, res) {
  try {
    const { type } = req.params;
    const validTypes = ["like_post", "comment_post", "mention_in_post", "new_follower", "reply_comment", "share_post", "security_alert"];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid notification type" });
    }

    const notifications = await Notification.find({
      recipient: req.user._id,
      type: type,
    })
      .populate("sender", "firstName lastName avatar")
      .populate("post", "_id caption")
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      type: type,
      read: false,
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllRead,
  deleteNotification,
  createMessageNotification,
  getMessageNotifications,
  createLikeNotification,
  createCommentNotification,
  createMentionNotification,
  createReplyNotification,
  createShareNotification,
  createFollowerNotification,
  createSecurityAlertNotification,
  getNotificationsByType,
};