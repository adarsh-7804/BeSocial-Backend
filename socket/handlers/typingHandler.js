module.exports = (io, socket) => {
  const typingUsers = new Map(); // conversationId -> Set of user ids
  const typingTimeouts = new Map(); // conversationId -> Map of userId -> timeoutId

  socket.on("typing_start", ({ conversationId }) => {
    // Clear previous timeout for this user in this conversation
    if (typingTimeouts.has(conversationId)) {
      const userTimeout = typingTimeouts.get(conversationId).get(socket.user._id);
      if (userTimeout) clearTimeout(userTimeout);
    }

    // Broadcast to room
    socket.to(conversationId).emit("typing_indicator", {
      userId: socket.user._id,
      name: socket.user.firstName,
      isTyping: true,
    });

    // Track typing user
    if (!typingUsers.has(conversationId)) {
      typingUsers.set(conversationId, new Set());
    }
    typingUsers.get(conversationId).add(socket.user._id);

    // Auto-stop after 5 seconds of inactivity
    const timeout = setTimeout(() => {
      socket.to(conversationId).emit("typing_indicator", {
        userId: socket.user._id,
        name: socket.user.firstName,
        isTyping: false,
      });

      // Remove from tracking
      if (typingUsers.has(conversationId)) {
        typingUsers.get(conversationId).delete(socket.user._id);
      }
      if (typingTimeouts.has(conversationId)) {
        typingTimeouts.get(conversationId).delete(socket.user._id);
      }
    }, 5000);

    // Store timeout
    if (!typingTimeouts.has(conversationId)) {
      typingTimeouts.set(conversationId, new Map());
    }
    typingTimeouts.get(conversationId).set(socket.user._id, timeout);
  });

  socket.on("typing_stop", ({ conversationId }) => {
    // Clear timeout
    if (typingTimeouts.has(conversationId)) {
      const userTimeout = typingTimeouts.get(conversationId).get(socket.user._id);
      if (userTimeout) clearTimeout(userTimeout);
      typingTimeouts.get(conversationId).delete(socket.user._id);
    }

    // Broadcast to room
    socket.to(conversationId).emit("typing_indicator", {
      userId: socket.user._id,
      name: socket.user.firstName,
      isTyping: false,
    });

    // Remove from tracking
    if (typingUsers.has(conversationId)) {
      typingUsers.get(conversationId).delete(socket.user._id);
    }
  });

  // Cleanup when user disconnects
  socket.on("disconnect", () => {
    typingUsers.forEach((users, conversationId) => {
      if (users.has(socket.user._id)) {
        // Notify others
        socket.to(conversationId).emit("typing_indicator", {
          userId: socket.user._id,
          name: socket.user.firstName,
          isTyping: false,
        });
        users.delete(socket.user._id);
      }
    });

    // Clear all timeouts for this user
    typingTimeouts.forEach((userMap) => {
      userMap.forEach((timeout) => clearTimeout(timeout));
      userMap.clear();
    });
  });
};