const Notification = require("../../models/Notification");

module.exports = (io, socket) => {
  // Emit notification to a specific user
  socket.on("send_notification", async (data) => {
    try {
      const { recipientId, type, senderId, postId, message } = data;

      if (!recipientId || !type) return;

      // Save notification to database
      const notification = await Notification.create({
        recipient: recipientId,
        sender: senderId,
        type: type,
        post: postId || null,
        message: message || "",
        read: false,
      });

      const populated = await notification.populate([
        { path: "sender", select: "firstName lastName avatar" },
        { path: "post", select: "_id caption" },
      ]);

      // Emit to recipient's room
      io.to(recipientId.toString()).emit("notification_received", populated);
    } catch (err) {
      console.error("Error sending notification:", err.message);
    }
  });

  // Like notification
  socket.on("like_notification", async (data) => {
    try {
      const { recipientId, senderId, postId } = data;
      if (recipientId.toString() === senderId.toString()) return;

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

      io.to(recipientId.toString()).emit("notification_received", {
        type: "like_post",
        notification: populated,
      });
    } catch (err) {
      console.error("Like notification error:", err.message);
    }
  });

  // Comment notification
  socket.on("comment_notification", async (data) => {
    try {
      const { recipientId, senderId, postId, commentContent } = data;
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

      io.to(recipientId.toString()).emit("notification_received", {
        type: "comment_post",
        notification: populated,
      });
    } catch (err) {
      console.error("Comment notification error:", err.message);
    }
  });

  // Mention notification
  socket.on("mention_notification", async (data) => {
    try {
      const { recipientId, senderId, postId } = data;
      if (recipientId.toString() === senderId.toString()) return;

      const notification = await Notification.create({
        recipient: recipientId,
        sender: senderId,
        type: "mention_in_post",
        post: postId,
        message: "Mentioned you in a post",
        read: false,
      });

      const populated = await notification.populate([
        { path: "sender", select: "firstName lastName avatar" },
        { path: "post", select: "_id caption" },
      ]);

      io.to(recipientId.toString()).emit("notification_received", {
        type: "mention_in_post",
        notification: populated,
      });
    } catch (err) {
      console.error("Mention notification error:", err.message);
    }
  });

  // Reply notification
  socket.on("reply_notification", async (data) => {
    try {
      const { recipientId, senderId, postId, replyContent } = data;
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

      io.to(recipientId.toString()).emit("notification_received", {
        type: "reply_comment",
        notification: populated,
      });
    } catch (err) {
      console.error("Reply notification error:", err.message);
    }
  });

  // Share notification
  socket.on("share_notification", async (data) => {
    try {
      const { recipientId, senderId, postId } = data;
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

      io.to(recipientId.toString()).emit("notification_received", {
        type: "share_post",
        notification: populated,
      });
    } catch (err) {
      console.error("Share notification error:", err.message);
    }
  });

  // New follower notification
  socket.on("follower_notification", async (data) => {
    try {
      const { recipientId, senderId } = data;
      if (recipientId.toString() === senderId.toString()) return;

      // Check if notification already exists
      const existingNotif = await Notification.findOne({
        recipient: recipientId,
        sender: senderId,
        type: "new_follower",
      });

      if (existingNotif) return;

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

      io.to(recipientId.toString()).emit("notification_received", {
        type: "new_follower",
        notification: populated,
      });
    } catch (err) {
      console.error("Follower notification error:", err.message);
    }
  });
};
