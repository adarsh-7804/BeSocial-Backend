const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");
const { resetPassword } = require("./authController");

const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, type = "text", replyTo } = req.body;
    const senderId = req.user._id;

    if (!conversationId || !content) {
      return res
        .status(400)
        .json({ message: "conversationId and content bith are required" });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      content,
      type,
      replyTo: replyTo || null,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
    });

    const populated = await message.populate([
      { path: "sender", select: "firstName lastName avatar" },
      { path: "replyTo", select: "content type sender mediaUrl" },
    ]);
    console.log("Emitting message to room:", conversationId);
    req.io.to(conversationId).emit("receive_message", populated);

    // Create notifications for all recipients (except sender)
    const conversation = await Conversation.findById(conversationId);
    if (conversation && conversation.participants) {
      for (const participantId of conversation.participants) {
        if (participantId.toString() !== senderId.toString()) {
          // Check if conversation is muted for this user
          const isMuted = conversation.isMuted.some(
            (mute) => mute.userId.toString() === participantId.toString()
          );

          // Only create notification if not muted
          if (!isMuted) {
            const notificationMessage = conversation.isGroup 
              ? `${req.user.firstName} sent a message in ${conversation.groupName}`
              : `${req.user.firstName} sent you a message`;

            await Notification.create({
              recipient: participantId,
              sender: senderId,
              type: "message",
              conversation: conversationId,
              messageId: message._id,
              message: notificationMessage,
              read: false,
            });

            // Emit notification via socket
            req.io.to(participantId.toString()).emit("message_notification", {
              messageId: message._id,
              conversationId: conversationId,
              sender: {
                _id: req.user._id,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                avatar: req.user.avatar,
              },
              content: content,
              timestamp: new Date(),
            });
          }
        }
      }
    }

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json(err.message);
  }
};

const getMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      conversation: conversationId,
    })
      .populate("sender", "firstName lastName avatar")
      .populate("replyTo", "content type sender mediaUrl")
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({
      conversation: conversationId,
    });

    res.status(200).json({
      messages: messages.reverse(),
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteFor } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(id);
    if (!message) return res.status(400).json("Message does not exists");

    if (deleteFor === "everyone") {
      if (message.sender.toString() !== userId.toString()) {
        return res.status(403).json({ message: "You are not authorized" });
      }

      message.isDeleted = true;
      message.content = "This message was deleted";
      message.mediaUrl = "";
      await message.save();

      req.io.to(message.conversation.toString()).emit("message_deleted", {
        messageId: message._id,
        conversationId: message.conversation,
        deleteFor: "everyone",
      });
    } else {
      if (!message.deleteFor.includes(userId)) {
        message.deleteFor.push(userId);
        await message.save();
      }
    }
    res.status(200).json({ message: "Message deleted", deleteFor });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const markMessageAsRead = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user._id;

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        "readBy.user": { $ne: userId },
      },
      {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date(),
          },
        },
      },
    );
    req.io.to(conversationId).emit("read_receipt", {
      conversationId,
      readBy: userId,
    });
    return res.status(200).json({ message: "Message marked as read" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const pinnedMessage = async (req, res) => {
  try {
    const { messageId, conversationId } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation)
      return res.status(404).json({ message: "Conversation not found" });

    if (!conversation.participants.includes(userId)) {
      return res
        .status(403)
        .json({ message: "Not authorized to pin the chat" });
    }

    if (conversation.participants.includes(messageId)) {
      return res.status(400).json({ message: "Message already pinned" });
    }

    conversation.pinnedMessage.push(messageId);
    await conversation.save();

    const message = await Message.findById(messageId).populate(
      "sender",
      "firstName lastName avatar",
    );

    req.io.to(conversationId).emit("message_pinned", {
      conversationId,
      message,
    });

    return res.status(200).json({ message });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const unpinnedMessage = async (req, res) => {
  try {
    const { messageId, conversationId } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ messgage: "You are not authorized" });
    }

    conversation.pinnedMessage = conversation.pinnedMessage.filter(
      (id) => id.toString() !== messageId,
    );
    await conversation.save();

    req.io.to(conversationId).emit("message_unpinned", {
      conversationId,
      messageId,
    });
    return res.status(200).json({ messageId, message: "Message Unpinned" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getPinnedMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId).populate({
      path: "pinnedMessage",
      populate: {
        path: "sender",
        select: "firstName lastName avatar",
      },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found " });
    }
    res.status(200).json(conversation.pinnedMessage);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Helper function

const getMediaType = (mimeType) => {
  if (!mimeType) return "file";

  if (mimeType.startsWith("image")) return "image";
  if (mimeType.startsWith("video")) return "video";
  return "file";
};

const sendMediaMessage = async (req, res) => {
  try {
    const { conversationId, replyTo } = req.body;
    const senderId = req.user._id;

    if (!conversationId) {
      return res.status(404).json({ message: "ConversationId is required" });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const savedMessages = [];

    for (const file of req.files) {
      const type = getMediaType(file.mimetype);
      
      // Normalize path to use forward slashes for URL compatibility
      const normalizedPath = file.path.replace(/\\/g, '/');

      const message = await Message.create({
        conversation: conversationId,
        sender: senderId,
        content: file.originalname,
        type,
        mediaUrl: normalizedPath,
        mediaName: file.originalname,
        mediaSize: file.size,
        replyTo: replyTo || null,
      });

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
      });

      const populated = await message.populate(
        "sender",
        "firstName lastName avatar",
      );

      req.io.to(conversationId).emit("receive_message", populated);

      savedMessages.push(populated);

      return res.status(201).json({
        conversationId,
        messages: savedMessages,
      });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const replyToMessage = async (req, res) =>  {
  try {
    const  { conversationId, content, replyTo } = req.body;
    const senderId = req.user._id;

    if(!conversationId || !content || !replyTo) {
      return res.status(400).json({
        message: "Something is missing"
      })
    }

    const originalMessage = await Message.findById(replyTo);
    if(!originalMessage) {
      return res.status(404).json({message:"Original message not found"});
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      content,
      type: "text",
      replyTo, 
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
    });

    const populated = await Message.findById(message._id)
      .populate("sender", "firstName lastName avatar")
      .populate({
        path: "replyTo",
        select: "content type mediaUrl mediaName sender isDeleted",
        populate: { path: "sender", select: "firstName lastName" },
      })

      req.io.to(conversationId).emit("receive_message", populated);

      res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const editMessage = async (req,res) => {
  try {
    const { id } = req.params;
    const { content } = req.body
    const userId = req.user._id;

    if(!content || !content.trim()) {
      return res.status(400).json({ message: "Content can nto be empty" })
    }

    const message = await Message.findById(id);
    if(!message) {
      return res.status(404).json({ message: "message not found" })
    }

    if(message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Owner can only edit this message"})
    }

    if(message.type !=="text"){
      res.status(400).json({message: "Only text message can be edited"})
    }

    if(message.isDeleted) {
      res.status(400).json({message: "Message does is deleted"})
    }
    message.content  = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    req.io.to(message.conversation.toString()).emit("message_edited", {
      messageId: message._id,
      conversationId: message.conversation.toString(),
      content: message.content,
      editedAt: message.editedAt,
    });

    res.status(200).json(message)
  } catch (err) {
    return res.status(500).json({message: err.message})
  }
}

const forwardMessage = async (req, res) => {
  try {
    const { messageId, targetConversationId } = req.body;
    const userId = req.user._id;

    if (!messageId || !targetConversationId) {
      return res.status(400).json({ message: "messageId and targetConversationId are required" });
    }

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({ message: "Message not found" });
    }

    const forwardedMessage = await Message.create({
      conversation: targetConversationId,
      sender: userId,
      content: originalMessage.content,
      type: originalMessage.type,
      mediaUrl: originalMessage.mediaUrl,
      mediaName: originalMessage.mediaName,
      mediaSize: originalMessage.mediaSize,
      isForwarded: true,
      forwardedFrom: originalMessage._id,
    });

    await Conversation.findByIdAndUpdate(targetConversationId, {
      lastMessage: forwardedMessage._id,
    });

    const populated = await forwardedMessage.populate([
      { path: "sender", select: "firstName lastName avatar" },
      { path: "forwardedFrom", select: "content type mediaUrl sender" },
    ]);

    req.io.to(targetConversationId).emit("receive_message", populated);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  sendMessage,
  getMessage,
  deleteMessage,
  markMessageAsRead,
  pinnedMessage,
  unpinnedMessage,
  getPinnedMessages,
  sendMediaMessage,
  replyToMessage,
  editMessage,
  forwardMessage
};
