const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authmiddleware");
const storyUpload = require("../middlewares/storyUpload");
const {
  createStory, getStoryFeed, getUserStories, viewStory, getStoryViewers,
  deleteStory, likeStory, unlikeStory, replyToStory, getStoryReplies,
  deleteReply, muteUserStories, unmuteUserStories,
} = require("../controllers/storyController");

// All routes require authentication
router.use(authMiddleware);

// Story CRUD
router.post("/create", storyUpload, createStory);
router.get("/", getStoryFeed);
router.get("/user/:userId", getUserStories);
router.delete("/:storyId", deleteStory);

// Views
router.put("/:storyId/view", viewStory);
router.get("/:storyId/viewers", getStoryViewers);

// Reactions
router.post("/:storyId/like", likeStory);
router.delete("/:storyId/like", unlikeStory);

// Replies
router.post("/:storyId/reply", replyToStory);
router.get("/:storyId/replies", getStoryReplies);
router.delete("/:storyId/reply/:replyId", deleteReply);

// Mute / Unmute
router.post("/mute/:userId", muteUserStories);
router.delete("/mute/:userId", unmuteUserStories);

module.exports = router;
