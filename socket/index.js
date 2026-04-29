const jwt = require("jsonwebtoken");
const User = require("../models/user");
const registerMessageHandlers = require("./handlers/messageHandler");
const registerTypingHandlers = require("./handlers/typingHandler");
const registerStatusHandlers = require("./handlers/statusHandler");
const registerRoomHandlers = require("./handlers/roomHandler");
const registerConversationHandlers = require("./handlers/conversationHandler");
const registerNotificationHandlers = require("./handlers/notificationHandler");

const onlineUsers = new Map();

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication token missing"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User connected: ${userId}`);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }

    onlineUsers.get(userId).add(socket.id);

    socket.join(userId);

    // Update user status in DB
    await User.findByIdAndUpdate(userId, { onlineStatus: "online" });

    io.emit("user_online", { userId, status: "online" });

    registerRoomHandlers(io, socket);
    registerMessageHandlers(io, socket, onlineUsers);
    registerTypingHandlers(io, socket);
    registerStatusHandlers(io, socket, onlineUsers);
    registerConversationHandlers(io, socket);
    registerNotificationHandlers(io, socket);


    socket.on("user_going_offline", async (data, callback) => {
      console.log(`User explicitly going offline: ${userId}`);
      onlineUsers.delete(userId);
      const lastSeen = new Date().toISOString();


      await User.findByIdAndUpdate(userId, {
        onlineStatus: "offline",
        lastSeen,
      });


      const Conversation = require("../models/Conversation");
      const userConversations = await Conversation.find({
        participants: userId,
      });


      userConversations.forEach((conv) => {
        io.to(conv._id.toString()).emit("user_status_changed", {
          userId,
          status: "offline",
          lastSeen,
        });
      });

      io.emit("user_online", { userId, status: "offline", lastSeen });

      if (callback) callback({ success: true });
    });



    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${userId}`);

      const userSockets = onlineUsers.get(userId);

      if (userSockets) {
        userSockets.delete(socket.id);


        if (userSockets.size > 0) {
          return;
        }


        onlineUsers.delete(userId);
      }

      const lastSeen = new Date();

      await User.findByIdAndUpdate(userId, {
        onlineStatus: "offline",
        lastSeen,
      });

      const Conversation = require("../models/Conversation");

      const userConversations = await Conversation.find({
        participants: userId,
      });

      userConversations.forEach((conv) => {
        io.to(conv._id.toString()).emit("user_status_changed", {
          userId,
          status: "offline",
          lastSeen,
        });
      });

      io.emit("user_online", {
        userId,
        status: "offline",
        lastSeen,
      });
    });
  });
};
