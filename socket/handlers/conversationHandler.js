const Conversation = require("../../models/Conversation");

const registerConversationHandlers = (io, socket) => {
  // Mute Conversation
  socket.on("mute_conversation", async (data, callback) => {
    try {
      const { conversationId } = data;
      const userId = socket.user._id;

      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return callback({ error: "Conversation not found" });
      }

      const isMutedByUser = conversation.isMuted.some(
        (mute) => mute.userId.toString() === userId.toString()
      );

      if (isMutedByUser) {
        return callback({ error: "Conversation already muted" });
      }

      conversation.isMuted.push({
        userId: userId,
        mutedAt: new Date(),
      });

      await conversation.save();

      io.to(conversationId).emit("conversation_muted", {
        conversationId,
        mutedBy: userId,
        isMuted: conversation.isMuted,
      });

      callback({ success: true, message: "Conversation muted" });
    } catch (err) {
      callback({ error: err.message });
    }
  });

  // Unmute Conversation
  socket.on("unmute_conversation", async (data, callback) => {
    try {
      const { conversationId } = data;
      const userId = socket.user._id;

      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return callback({ error: "Conversation not found" });
      }

      const isMutedByUser = conversation.isMuted.some(
        (mute) => mute.userId.toString() === userId.toString()
      );

      if (!isMutedByUser) {
        return callback({ error: "Conversation is not muted" });
      }

      conversation.isMuted = conversation.isMuted.filter(
        (mute) => mute.userId.toString() !== userId.toString()
      );

      await conversation.save();

      io.to(conversationId).emit("conversation_unmuted", {
        conversationId,
        unMutedBy: userId,
        isMuted: conversation.isMuted,
      });

      callback({ success: true, message: "Conversation unmuted" });
    } catch (err) {
      callback({ error: err.message });
    }
  });

  // Archive Conversation
  socket.on("archive_conversation", async (data, callback) => {
    try {
      const { conversationId } = data;
      const userId = socket.user._id;

      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return callback({ error: "Conversation not found" });
      }

      const isArchivedByUser = conversation.isArchived.some(
        (archive) => archive.userId.toString() === userId.toString()
      );

      if (isArchivedByUser) {
        return callback({ error: "Conversation already archived" });
      }

      conversation.isArchived.push({
        userId: userId,
        archivedAt: new Date(),
      });

      await conversation.save();

      io.to(userId.toString()).emit("conversation_archived", {
        conversationId,
        archivedBy: userId,
      });

      callback({ success: true, message: "Conversation archived" });
    } catch (err) {
      callback({ error: err.message });
    }
  });

  // Unarchive Conversation
  socket.on("unarchive_conversation", async (data, callback) => {
    try {
      const { conversationId } = data;
      const userId = socket.user._id;

      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return callback({ error: "Conversation not found" });
      }

      const isArchivedByUser = conversation.isArchived.some(
        (archive) => archive.userId.toString() === userId.toString()
      );

      if (!isArchivedByUser) {
        return callback({ error: "Conversation is not archived" });
      }

      conversation.isArchived = conversation.isArchived.filter(
        (archive) => archive.userId.toString() !== userId.toString()
      );

      await conversation.save();

      io.to(userId.toString()).emit("conversation_unarchived", {
        conversationId,
        unArchivedBy: userId,
      });

      callback({ success: true, message: "Conversation unarchived" });
    } catch (err) {
      callback({ error: err.message });
    }
  });
};

module.exports = registerConversationHandlers;