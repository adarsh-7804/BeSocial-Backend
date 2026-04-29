const { model } = require("mongoose");
const Conversation = require("../models/Conversation");
const message = require("../models/Message");
const User = require("../models/user");

// 1 to 1 conversation

const getOrCreateConversation = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json("Recivder Id is required");
    }

    if (senderId.toString() === receiverId) {
      return res.status(400).json("You can not create a room with your self");
    }

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [senderId, receiverId], $size: 2 },
    })
      .populate(
        "participants",
        "firstName lastName avatar onlineStatus lastSeen",
      )
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "firstName lastName avatar" },
      });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        isGroup: false,
      });

      conversation = await conversation.populate(
        "participants",
        "lastName firstName avatar onlineStatus lastSeen",
      );
    }

    res.status(200).json(conversation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
      "isArchived.userId": { $ne: userId },
    })
      .populate(
        "participants",
        "firstName lastName avatar onlineStatus lastSeen",
      )
      .populate("groupAdmin", "_id firstName lastName")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "firstName lastName avatar",
        },
      })
      .sort({ updatedAt: -1 });

    const conversationsWithFlags = conversations.map((conv) => ({
      ...conv.toObject(),
      isMutedByUser: conv.isMuted.some(
        (m) => m.userId.toString() === userId.toString(),
      ),

      isArchivedByUser: conv.isArchived.some(
        (a) => a.userId.toString() === userId.toString(),
      ),
    }));

    res.status(200).json(conversationsWithFlags);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createGroupConversation = async (req, res) => {
  try {
    const { groupName, participantsId } = req.body;

    const creatorId = req.user.id;

    if (!groupName || !groupName.trim())
      return res.status(400).json({ message: "Group name is required" });

    if (!participantsId || participantsId.length < 2)
      return res.status(400).json({ message: "Select atlest two members" });

    const allParticipants = [...new Set([creatorId, ...participantsId])];

    let conversation = await Conversation.create({
      isGroup: true,
      groupName: groupName,
      groupAdmin: creatorId,
      participants: allParticipants,
    });

    conversation = await conversation.populate([
      {
        path: "participants",
        select: "firstName lastName avatar onlineStatus lastSeen",
      },
      { path: "groupAdmin", select: "_id firstName lastName" },
    ]);

    allParticipants.forEach(async (participantsId) => {
      req.io.to(participantsId.toString()).emit("group_created", conversation);
    });

    res.status(201).json(conversation);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const updateGroupName = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId, newGroupName } = req.body;

    if (!newGroupName || !newGroupName.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (conversation.groupAdmin.toString() !== userId.toString())
      return res
        .status(403)
        .json({ message: "Not authorized to change group name" });

    conversation.groupName = newGroupName.trim();
    await conversation.save();

    await conversation.populate([
      {
        path: "participants",
        select: "firstName lastName avatar onlineStatus",
      },
      { path: "groupAdmin", select: "_id firstName lastName" },
    ]);

    req.io.to(conversationId).emit("group_name_updated", {
      conversationId,
      newGroupName: conversation.groupName,
      updatedBy: req.user.firstName,
    });

    res.status(200).json({ message: "Group name updated", conversation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const removeMemberFromGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId, memberIdToRemove } = req.body;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (conversation.groupAdmin.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to remove member" });
    }

    const memberExists = conversation.participants.some(
      (p) => p.toString() === memberIdToRemove,
    );

    if (!memberExists) {
      return res.status(400).json({ message: "Member does not exist" });
    }

    if (userId.toString() === memberIdToRemove) {
      return res
        .status(400)
        .json({ message: "Admin cannot remove themselves" });
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== memberIdToRemove,
    );

    await conversation.save();
    await conversation.populate([
      {
        path: "participants",
        select: "firstName lastName avatar onlineStatus",
      },
      { path: "groupAdmin", select: "_id firstName lastName" },
    ]);

    req.io.to(conversationId).emit("member_removed", {
      conversationId,
      removedMemberId: memberIdToRemove,
      remainingParticipants: conversation.participants,
      removedBy: req.user.firstName,
    });

    req.io.to(memberIdToRemove).emit("removed_from_group", {
      conversationId,
      groupName: conversation.groupName,
      removedBy: req.user.firstName,
    });

    res
      .status(200)
      .json({ message: "Member removed successfully", conversation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const searchConversations = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user._id;

    if (!q) return res.status(400).json({ message: "Query is required" });

    const matchingUsers = await User.find({
      _id: { $ne: userId },
      $or: [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
      ],
    }).select("_id");

    const matchingUserIds = matchingUsers.map((u) => u._id);

    const conversations = await Conversation.find({
      participants: userId,
      $or: [
        { participants: { $in: matchingUserIds } },
        { groupName: { $regex: q, $options: "i" }, isGroup: true },
      ],
    })
      .populate("participants", "firstName lastName avatar onlineStatus")
      .populate("lastMessage");

    res.status(200).json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const muteConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.body;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    const isMutedByUser = conversation.isMuted.some(
      (mute) => mute.userId.toString() === userId.toString(),
    );

    if (!isMutedByUser) {
      conversation.isMuted.push({
        userId: userId,
        mutedAt: new Date(),
      });

      await conversation.save();
    }

    await conversation.populate([
      {
        path: "participants",
        select: "firstName lastName avatar onlineStatus",
      },
      { path: "groupAdmin", select: "_id firstName lastName" },
    ]);

    req.io.to(conversationId).emit("conversation_muted", {
      conversationId,
      mutedBy: userId,
      isMuted: conversation.isMuted,
    });

    res
      .status(200)
      .json({ message: "Conversation muted successfully", conversation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const unmuteConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.body;

    const conversation = await Conversation.findById(conversationId);

    const isMutedByUser = conversation.isMuted.some(
      (mute) => mute.userId.toString() === userId.toString(),
    );

    if (isMutedByUser) {
      conversation.isMuted = conversation.isMuted.filter(
        (mute) => mute.userId.toString() !== userId.toString(),
      );

      await conversation.save();
    }
    await conversation.populate([
      {
        path: "participants",
        select: "firstName lastName avatar onlineStatus",
      },
      { path: "groupAdmin", select: "_id firstName lastName" },
    ]);

    req.io.to(conversationId).emit("conversation_unmuted", {
      conversationId,
      unMutedBy: userId,
      isMuted: conversation.isMuted,
    });

    res
      .status(200)
      .json({ message: "Conversation unmuted successfully", conversation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const archiveConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.body;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isArchivedByUser = conversation.isArchived.some(
      (archive) => archive.userId.toString() === userId.toString(),
    );

    if (!isArchivedByUser) {
      conversation.isArchived.push({
        userId: userId,
        archivedAt: new Date(),
      });

      await conversation.save();
    }
    await conversation.populate([
      {
        path: "participants",
        select: "firstName lastName avatar onlineStatus",
      },
      { path: "groupAdmin", select: "_id firstName lastName" },
    ]);

    req.io.to(userId.toString()).emit("conversation_archived", {
      conversationId,
      archivedBy: userId,
    });

    res
      .status(200)
      .json({ message: "Conversation archived successfully", conversation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateGroupProfilePic = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!conversation.isGroup) {
      return res.status(400).json({ message: "This is not a group" });
    }

    if (conversation.groupAdmin.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update group profile picture" });
    }

    // Store the file path
    const fileUrl = `/uploads/${req.file.filename}`;
    conversation.groupProfilePic = fileUrl;
    await conversation.save();

    await conversation.populate([
      {
        path: "participants",
        select: "firstName lastName avatar onlineStatus",
      },
      { path: "groupAdmin", select: "_id firstName lastName" },
    ]);

    req.io.to(conversationId).emit("group_profile_pic_updated", {
      conversationId,
      groupProfilePic: conversation.groupProfilePic,
      updatedBy: req.user.firstName,
    });

    res.status(200).json({
      message: "Group profile picture updated",
      conversation,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const unarchiveConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.body;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isArchivedByUser = conversation.isArchived.some(
      (archive) => archive.userId.toString() === userId.toString(),
    );

    if (isArchivedByUser) {
      conversation.isArchived = conversation.isArchived.filter(
        (archive) => archive.userId.toString() !== userId.toString(),
      );

      await conversation.save();
    }
    await conversation.populate([
      {
        path: "participants",
        select: "firstName lastName avatar onlineStatus",
      },
      { path: "groupAdmin", select: "_id firstName lastName" },
    ]);

    req.io.to(userId.toString()).emit("conversation_unarchived", {
      conversationId,
      unArchivedBy: userId,
    });

    res
      .status(200)
      .json({ message: "Conversation unarchived successfully", conversation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getArchivedConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const archivedConversations = await Conversation.find({
      participants: userId,
      "isArchived.userId": userId,
    })
      .populate(
        "participants",
        "firstName lastName avatar onlineStatus lastSeen",
      )
      .populate("groupAdmin", "_id firstName lastName")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "firstName lastName avatar",
        },
      })
      .sort({ updatedAt: -1 });

    const result = archivedConversations.map((conv) => ({
      ...conv.toObject(),

      isMutedByUser: conv.isMuted.some(
        (m) => m.userId.toString() === userId.toString(),
      ),

      isArchivedByUser: true,
    }));

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getOrCreateConversation,
  getUserConversations,
  createGroupConversation,
  updateGroupName,
  updateGroupProfilePic,
  removeMemberFromGroup,
  searchConversations,
  muteConversation,
  unmuteConversation,
  archiveConversation,
  unarchiveConversation,
  getArchivedConversations,
};
