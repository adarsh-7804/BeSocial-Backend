module.exports = (io, socket, onlineUsers) => {
  socket.on("join_room", (conversationId) => {
    console.log("Backend joined room:", conversationId);
    socket.join(conversationId);
  });

  socket.on("leave_room", (conversationId) => {
    socket.leave(conversationId);
  });
};