const Story = require("../models/Story");
const User = require("../models/user");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

function isStoryActive(story) {
  const now = new Date();
  const expiry = new Date(story.createdAt.getTime() + 24 * 60 * 60 * 1000);
  return now <= expiry;
}

const createStory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, textContent, textStyle, privacy } = req.body;

    if (!type || !["image", "video", "text"].includes(type)) {
      return res.status(400).json({ message: "Invalid story type." });
    }
    if ((type === "image" || type === "video") && !req.file) {
      return res
        .status(400)
        .json({ message: `Media file required for ${type} stories.` });
    }
    if (type === "text" && (!textContent || !textContent.trim())) {
      return res
        .status(400)
        .json({ message: "Text content required for text stories." });
    }

    const storyData = { userId, type, privacy: privacy || "public" };
    if (req.file) storyData.mediaUrl = req.file.path.replace(/\\/g, "/");
    if (type === "text") {
      storyData.textContent = textContent.trim();
      if (textStyle) {
        try {
          storyData.textStyle =
            typeof textStyle === "string" ? JSON.parse(textStyle) : textStyle;
        } catch (e) {}
      }
    }

    const story = await Story.create(storyData);
    const populated = await Story.findById(story._id).populate(
      "userId",
      "firstName lastName username avatar",
    );
    res.status(201).json({ message: "Story created", story: populated });
  } catch (error) {
    console.error("Create story error:", error);
    res.status(500).json({ message: "Failed to create story" });
  }
};

const getStoryFeed = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId);
    const mutedUsers = currentUser?.mutedStories || [];
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await Story.find({
      createdAt: { $gte: twentyFourHoursAgo },
      userId: { $nin: mutedUsers },
    })
      .populate("userId", "firstName lastName username avatar")
      .populate("viewers.userId", "firstName lastName username avatar")
      .populate("reactions.userId", "firstName lastName username avatar")
      .sort({ createdAt: -1 });

    const filtered = stories.filter((story) => {
      if (!story.userId) return false;

      const storyOwnerId = story.userId._id.toString();
      const currentId = currentUserId.toString();

      if (storyOwnerId === currentId) return true;

      // Public
      if (story.privacy === "public") return true;

      // Friends
      if (story.privacy === "friends") {
        return currentUser.friends?.some(
          (friendId) => friendId.toString() === storyOwnerId,
        );
      }

      // Private
      if (story.privacy === "private") {
        return false;
      }

      return false;
    });

    // Group by user
    const groupedMap = new Map();
    filtered.forEach((story) => {
      const uid = story.userId._id.toString();
      if (!groupedMap.has(uid)) {
        groupedMap.set(uid, {
          user: {
            _id: story.userId._id,
            firstName: story.userId.firstName,
            lastName: story.userId.lastName,
            username: story.userId.username,
            avatar: story.userId.avatar,
          },
          stories: [],
          hasUnviewed: false,
        });
      }
      const group = groupedMap.get(uid);
      const isViewed = story.viewers.some(
        (v) =>
          v.userId &&
          v.userId._id &&
          v.userId._id.toString() === currentUserId.toString(),
      );
      group.stories.push({ ...story.toObject(), isViewed });
      if (!isViewed) group.hasUnviewed = true;
    });

    const grouped = Array.from(groupedMap.values());
    grouped.sort((a, b) => {
      const aOwner = a.user._id.toString() === currentUserId.toString();
      const bOwner = b.user._id.toString() === currentUserId.toString();
      if (aOwner) return -1;
      if (bOwner) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return 0;
    });

    res.json({ stories: grouped });
  } catch (error) {
    console.error("Get story feed error:", error);
    res.status(500).json({ message: "Failed to fetch stories" });
  }
};

const getUserStories = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await Story.find({
      userId,
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .populate("userId", "firstName lastName username avatar")
      .populate("viewers.userId", "firstName lastName username avatar")
      .sort({ createdAt: 1 });

    const enriched = stories.map((story) => {
      const isViewed = story.viewers.some(
        (v) => v.userId && v.userId._id.toString() === currentUserId.toString(),
      );
      return { ...story.toObject(), isViewed };
    });
    res.json({ stories: enriched });
  } catch (error) {
    console.error("Get user stories error:", error);
    res.status(500).json({ message: "Failed to fetch user stories" });
  }
};

const viewStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (!isStoryActive(story))
      return res.status(410).json({ message: "Story expired" });
    if (story.userId.toString() === userId.toString()) {
      return res.json({
        message: "Owner view not counted",
        viewCount: story.viewers.length,
      });
    }
    const alreadyViewed = story.viewers.some(
      (v) => v.userId.toString() === userId.toString(),
    );
    if (!alreadyViewed) {
      story.viewers.push({ userId, viewedAt: new Date() });
      await story.save();
    }
    res.json({
      message: alreadyViewed ? "Already viewed" : "View recorded",
      viewCount: story.viewers.length,
    });
  } catch (error) {
    console.error("View story error:", error);
    res.status(500).json({ message: "Failed to record view" });
  }
};

const getStoryViewers = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;
    const story = await Story.findById(storyId).populate(
      "viewers.userId",
      "firstName lastName username avatar",
    );
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (story.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Only the story owner can view this" });
    }
    const externalViewers = story.viewers.filter(
      (v) => v.userId && v.userId._id.toString() !== userId.toString(),
    );
    if (externalViewers.length === 0) {
      return res.json({ viewers: [], viewCount: 0, showAnalytics: false });
    }

    const viewersWithReactions = externalViewers.map((v) => {
      const reaction = story.reactions.find(
        (r) => r.userId && r.userId.toString() === v.userId._id.toString(),
      );
      return {
        ...v.toObject(),
        reaction: reaction ? reaction.type : null,
      };
    });

    res.json({
      viewers: viewersWithReactions,
      viewCount: externalViewers.length,
      showAnalytics: true,
    });
  } catch (error) {
    console.error("Get viewers error:", error);
    res.status(500).json({ message: "Failed to fetch viewers" });
  }
};

const deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (story.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await Story.findByIdAndDelete(storyId);
    res.json({ message: "Story deleted", storyId });
  } catch (error) {
    console.error("Delete story error:", error);
    res.status(500).json({ message: "Failed to delete story" });
  }
};

const likeStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;
    const { reactionType = "like" } = req.body;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (!isStoryActive(story))
      return res.status(410).json({ message: "Story expired" });

    const idx = story.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString(),
    );
    let action;
    if (idx !== -1) {
      story.reactions[idx].type = reactionType;
      story.reactions[idx].createdAt = new Date();
      action = "updated";
    } else {
      story.reactions.push({
        userId,
        type: reactionType,
        createdAt: new Date(),
      });
      action = "added";
    }
    await story.save();
    res.json({
      message: `Reaction ${action}`,
      action,
      reactionType,
      reactionsCount: story.reactions.length,
    });
  } catch (error) {
    console.error("Like story error:", error);
    res.status(500).json({ message: "Failed to react" });
  }
};

const unlikeStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });
    story.reactions = story.reactions.filter(
      (r) => r.userId.toString() !== userId.toString(),
    );
    await story.save();
    res.json({
      message: "Reaction removed",
      action: "removed",
      reactionsCount: story.reactions.length,
    });
  } catch (error) {
    console.error("Unlike story error:", error);
    res.status(500).json({ message: "Failed to remove reaction" });
  }
};

const replyToStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        message: "Reply text required",
      });
    }

    const story = await Story.findById(storyId).populate(
      "userId",
      "firstName lastName username avatar",
    );

    if (!story) {
      return res.status(404).json({
        message: "Story not found",
      });
    }

    if (!isStoryActive(story)) {
      return res.status(410).json({
        message: "Story expired",
      });
    }

    story.replies.push({
      userId,
      text: text.trim(),
      createdAt: new Date(),
    });

    await story.save();

    const ownerId = story.userId._id;

    if (ownerId.toString() === userId.toString()) {
      return res.status(201).json({
        message: "Reply saved",
      });
    }

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [userId, ownerId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, ownerId],
        isGroup: false,
      });
    }

    const newMessage = await Message.create({
      conversation: conversation._id,
      sender: userId,
      content: text.trim(),
      type: "text",

      replyToStory: {
        storyId: story._id,
        type: story.type,
        mediaUrl: story.mediaUrl || "",
        textContent: story.textContent || "",
        storyOwner: ownerId,
      },
    });

    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: newMessage._id,
    });

    const populated = await Message.findById(newMessage._id).populate([
      {
        path: "sender",
        select: "firstName lastName avatar",
      },
      {
        path: "replyToStory.storyOwner",
        select: "firstName lastName avatar",
      },
    ]);
    
    req.io.to(conversation._id.toString()).emit("receive_message", populated);

    return res.status(201).json({
      message: "Reply sent",
      chatMessage: populated,
      conversationId: conversation._id,
    });
  } catch (error) {
    console.error("Reply error:", error);
    res.status(500).json({
      message: "Failed to reply",
    });
  }
};

const getStoryReplies = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;
    const story = await Story.findById(storyId).populate(
      "replies.userId",
      "firstName lastName username avatar",
    );
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (story.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Only the story owner can view replies" });
    }
    res.json({ replies: story.replies, repliesCount: story.replies.length });
  } catch (error) {
    console.error("Get replies error:", error);
    res.status(500).json({ message: "Failed to fetch replies" });
  }
};

const deleteReply = async (req, res) => {
  try {
    const { storyId, replyId } = req.params;
    const userId = req.user._id;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });
    const reply = story.replies.id(replyId);
    if (!reply) return res.status(404).json({ message: "Reply not found" });
    const canDelete =
      reply.userId.toString() === userId.toString() ||
      story.userId.toString() === userId.toString();
    if (!canDelete) return res.status(403).json({ message: "Not authorized" });
    story.replies = story.replies.filter((r) => r._id.toString() !== replyId);
    await story.save();
    res.json({ message: "Reply deleted", replyId });
  } catch (error) {
    console.error("Delete reply error:", error);
    res.status(500).json({ message: "Failed to delete reply" });
  }
};

const muteUserStories = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { userId: targetUserId } = req.params;
    if (currentUserId.toString() === targetUserId)
      return res.status(400).json({ message: "Cannot mute yourself" });
    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { mutedStories: targetUserId },
    });
    res.json({ message: "User stories muted", mutedUserId: targetUserId });
  } catch (error) {
    console.error("Mute error:", error);
    res.status(500).json({ message: "Failed to mute" });
  }
};

const unmuteUserStories = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { userId: targetUserId } = req.params;
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { mutedStories: targetUserId },
    });
    res.json({ message: "User stories unmuted", unmutedUserId: targetUserId });
  } catch (error) {
    console.error("Unmute error:", error);
    res.status(500).json({ message: "Failed to unmute" });
  }
};

module.exports = {
  createStory,
  getStoryFeed,
  getUserStories,
  viewStory,
  getStoryViewers,
  deleteStory,
  likeStory,
  unlikeStory,
  replyToStory,
  getStoryReplies,
  deleteReply,
  muteUserStories,
  unmuteUserStories,
};
