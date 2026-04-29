const User = require("../../models/user");

module.exports = (io, socket, onlineUsers) => {
  const userId = socket.user._id.toString();

  // Get status of a specific user
  socket.on("get_user_status", async ({ userId }, callback) => {
    try {
      const isOnline = onlineUsers.has(userId);
      const user = await User.findById(userId).select("onlineStatus lastSeen");
      callback({ 
        userId, 
        isOnline,
        status: user?.onlineStatus || "offline",
        lastSeen: user?.lastSeen
      });
    } catch (err) {
      callback({ error: err.message });
    }
  });

  // Get multiple users' status
  socket.on("get_users_status", async ({ userIds }, callback) => {
    try {
      const statuses = userIds.map(id => ({
        userId: id,
        isOnline: onlineUsers.has(id)
      }));
      callback(statuses);
    } catch (err) {
      callback({ error: err.message });
    }
  });

  // Notify conversation participants about status change
  socket.on("notify_status_change", ({ conversationId, status }) => {
    if (conversationId) {
      socket.to(conversationId).emit("user_status_changed", {
        userId,
        status,
        timestamp: new Date()
      });
    }
  });
};