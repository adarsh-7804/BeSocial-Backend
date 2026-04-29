const ScheduledPost = require("../models/scheduledPost");
const { Post } = require("../models/post");
const mongoose = require("mongoose");

function extractHashtags(text) {
  if (!text || typeof text !== "string") return [];
  const matches = text.match(/#(\w+)/g);
  return matches
    ? [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))]
    : [];
}

//  Create Scheduled Post
// POST /api/scheduled-posts/schedule
async function schedulePost(req, res) {
  try {
    const {
      caption = "",
      content = "",
      locationName = "",
      lat = "",
      lng = "",
      audience = "public",
      scheduledAt,
      allowDownload = true,
    } = req.body;

    // Validate scheduled time
    if (!scheduledAt) {
      return res.status(400).json({ message: "Scheduled time is required" });
    }

    const scheduleDate = new Date(scheduledAt);
    const now = new Date();

    if (scheduleDate <= now) {
      return res
        .status(400)
        .json({ message: "Scheduled time must be in the future" });
    }

    // Max 30 days in advance
    const maxDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (scheduleDate > maxDate) {
      return res
        .status(400)
        .json({ message: "Cannot schedule more than 30 days in advance" });
    }

    const validAudience = ["public", "private", "friends"].includes(audience)
      ? audience
      : "public";

    const files = req.files || [];

    const media = files.map((file) => {
      const isVideo = file.mimetype?.startsWith("video/");
      const isGif =
        file.mimetype === "image/gif" || file.originalname?.endsWith(".gif");
      return {
        url: file.path,
        type: isVideo ? "video" : isGif ? "gif" : "image",
      };
    });

    // Must have content or media
    if (!content.trim() && media.length === 0) {
      return res
        .status(400)
        .json({ message: "Post must have content or media" });
    }

    const hashtags = [
      ...new Set([...extractHashtags(caption), ...extractHashtags(content)]),
    ];

    const scheduledPost = await ScheduledPost.create({
      user: req.user._id,
      caption,
      content,
      media,
      hashtags,
      locationName,
      coordinates:
        lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined,
      audience: validAudience,
      scheduledAt: scheduleDate,
      status: "pending",
      allowDownload: allowDownload !== "false" && allowDownload !== false,
    });

    res.status(201).json({
      message: "Post scheduled successfully",
      scheduledPost,
    });
  } catch (err) {
    console.error("Schedule post error:", err);
    res.status(500).json({ message: err.message });
  }
}

//  Get All Scheduled Posts for User
// GET /api/scheduled-posts/
async function getScheduledPosts(req, res) {
  try {
    const scheduledPosts = await ScheduledPost.find({
      user: req.user._id,
      status: { $in: ["pending", "failed"] },
    })
      .sort({ scheduledAt: 1 })
      .lean();

    res.json({ scheduledPosts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

//  Get Single Scheduled Post
// GET /api/scheduled-posts/:id
async function getScheduledPostById(req, res) {
  try {
    const scheduledPost = await ScheduledPost.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!scheduledPost) {
      return res.status(404).json({ message: "Scheduled post not found" });
    }

    res.json({ scheduledPost });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

//  Update Scheduled Post (only if still pending)
// PUT /api/scheduled-posts/:id
async function updateScheduledPost(req, res) {
  try {
    const {
      caption,
      content,
      locationName,
      lat,
      lng,
      audience,
      scheduledAt,
    } = req.body;

    const existingPost = await ScheduledPost.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!existingPost) {
      return res.status(404).json({ message: "Scheduled post not found" });
    }

    if (existingPost.status !== "pending") {
      return res.status(400).json({
        message: "Cannot update post that is already published or cancelled",
      });
    }

    // Validate new schedule time if provided
    if (scheduledAt) {
      const scheduleDate = new Date(scheduledAt);
      const now = new Date();

      if (scheduleDate <= now) {
        return res
          .status(400)
          .json({ message: "Scheduled time must be in the future" });
      }

      const maxDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (scheduleDate > maxDate) {
        return res
          .status(400)
          .json({ message: "Cannot schedule more than 30 days in advance" });
      }
    }

    const files = req.files || [];
    const newMedia = files.map((file) => {
      const isVideo = file.mimetype?.startsWith("video/");
      const isGif =
        file.mimetype === "image/gif" || file.originalname?.endsWith(".gif");
      return {
        url: file.path,
        type: isVideo ? "video" : isGif ? "gif" : "image",
      };
    });

    // Build update object
    const updateData = {
      ...(caption !== undefined && { caption }),
      ...(content !== undefined && { content }),
      ...(locationName !== undefined && { locationName }),
      ...(lat && lng && { coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) } }),
      ...(audience && ["public", "private", "friends"].includes(audience) && { audience }),
      ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
    };

    // Only update media if new files uploaded
    if (newMedia.length > 0) {
      updateData.media = newMedia;
    }

    // Recalculate hashtags if caption or content changed
    if (caption !== undefined || content !== undefined) {
      updateData.hashtags = [
        ...new Set([
          ...extractHashtags(updateData.caption || existingPost.caption),
          ...extractHashtags(updateData.content || existingPost.content),
        ]),
      ];
    }

    const updatedPost = await ScheduledPost.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json({
      message: "Scheduled post updated",
      scheduledPost: updatedPost,
    });
  } catch (err) {
    console.error("Update scheduled post error:", err);
    res.status(500).json({ message: err.message });
  }
}

//  Cancel/Delete Scheduled Post
// DELETE /api/scheduled-posts/:id
async function cancelScheduledPost(req, res) {
  try {
    const scheduledPost = await ScheduledPost.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!scheduledPost) {
      return res.status(404).json({ message: "Scheduled post not found" });
    }

    if (scheduledPost.status === "published") {
      return res
        .status(400)
        .json({ message: "Cannot delete already published post" });
    }

    await scheduledPost.deleteOne();

    res.json({
      message: "Scheduled post cancelled",
      scheduledPostId: req.params.id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

//  Publish Scheduled Post (internal use by cron job)
// This is also exposed as API for manual trigger if needed
//  Publish Scheduled Post (NO SESSIONS - for standalone MongoDB)
async function publishScheduledPost(scheduledPostId) {
  try {
    const scheduledPost = await ScheduledPost.findById(scheduledPostId);

    if (!scheduledPost || scheduledPost.status !== "pending") {
      return { success: false, reason: "Post not found or not pending" };
    }

    // Create the actual post
    const post = new Post({
      user: scheduledPost.user,
      caption: scheduledPost.caption,
      content: scheduledPost.content,
      media: scheduledPost.media,
      hashtags: scheduledPost.hashtags,
      tags: [],
      audience: scheduledPost.audience,
      location: scheduledPost.locationName
        ? {
            name: scheduledPost.locationName,
            coordinates: scheduledPost.coordinates,
          }
        : undefined,
    });

    await post.save();

    // Update scheduled post status
    scheduledPost.status = "published";
    scheduledPost.publishedPostId = post._id;
    await scheduledPost.save();

    // Populate user data for return
    await post.populate("user", "firstName lastName avatar");

    console.log(`[publishScheduledPost] Successfully published post ${post._id}`);
    return { success: true, post, scheduledPost };
  } catch (err) {
    console.error("[publishScheduledPost] Error:", err.message);
    
    // Mark as failed
    await ScheduledPost.findByIdAndUpdate(scheduledPostId, {
      status: "failed",
      failureReason: err.message,
    });

    return { success: false, reason: err.message };
  }
}
//  Cron Job Handler (called by the scheduler)
// Publishes all pending posts whose time has come
// async function processDuePosts() {
//   const now = new Date();

//   const duePosts = await ScheduledPost.find({
//     status: "pending",
//     scheduledAt: { $lte: now },
//   });

//   console.log(`[Cron] Found ${duePosts.length} posts to publish`);

//   const results = await Promise.all(
//     duePosts.map((post) => publishScheduledPost(post._id))
//   );

//   const successful = results.filter((r) => r.success).length;
//   const failed = results.filter((r) => !r.success).length;

//   console.log(`[Cron] Published: ${successful}, Failed: ${failed}`);

//   return { processed: duePosts.length, successful, failed };
// }

async function processDuePosts() {
  try {
    const now = new Date();
    console.log(`[processDuePosts] Current time: ${now.toISOString()}`);
    console.log(`[processDuePosts] Looking for posts with scheduledAt <= ${now.toISOString()}`);

    const duePosts = await ScheduledPost.find({
      status: "pending",
      scheduledAt: { $lte: now },
    });

    console.log(`[processDuePosts] Found ${duePosts.length} due posts`);
    
    if (duePosts.length > 0) {
      duePosts.forEach((post, i) => {
        console.log(`[processDuePosts] Post ${i + 1}: id=${post._id}, scheduledAt=${post.scheduledAt}, content="${post.content?.substring(0, 30)}..."`);
      });
    }

    const results = await Promise.all(
      duePosts.map((post) => publishScheduledPost(post._id))
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`[processDuePosts] Published: ${successful}, Failed: ${failed}`);
    
    if (failed > 0) {
      results.filter(r => !r.success).forEach(r => {
        console.log(`[processDuePosts] Failed reason: ${r.reason}`);
      });
    }

    return { processed: duePosts.length, successful, failed };
  } catch (err) {
    console.error("[processDuePosts] CRITICAL ERROR:", err);
    throw err;
  }
}

module.exports = {
  schedulePost,
  getScheduledPosts,
  getScheduledPostById,
  updateScheduledPost,
  cancelScheduledPost,
  publishScheduledPost,
  processDuePosts,
};