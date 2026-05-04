const path = require("path");
const { Post } = require("../models/post");
const Like = require("../models/like");
const Comment = require("../models/comment");
const User = require("../models/user");
const Notification = require("../models/Notification");
const {
  createLikeNotification,
  createCommentNotification,
  createReplyNotification,
  createMentionNotification,
} = require("./Notificationcontroller");
const {
  getFollowingFeed,
  getForYouFeed,
  getTrendingFeed,
  getLatestFeed,
} = require("./feedController");
const { containsAdultContent } = require("../utils/profanityFilter");

function extractHashtags(text) {
  if (!text || typeof text !== "string") return [];
  const matches = text.match(/#(\w+)/g);
  return matches
    ? [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))]
    : [];
}

//  GET FEED
async function getFeed(req, res) {
  const { type = "following", page = 1, limit = 10 } = req.query;

  switch (type) {
    case "following":
      return getFollowingFeed(req, res, page, limit);
    case "forYou":
      return getForYouFeed(req, res, page, limit);
    case "trending":
      return getTrendingFeed(req, res, page, limit);
    case "latest":
      return getLatestFeed(req, res, page, limit);
    default:
      return res.status(400).json({ message: "Invalid feed type" });
  }
}

//  CREATE POST
async function createPost(req, res) {
  try {
    const caption = req.body?.caption || "";
    const files = req.files || [];
    const videoFile = files.find((f) => f.mimetype?.startsWith("video/"));
    const content = req.body?.content || "";
    const locationName = req.body?.locationName || "";
    const lat = req.body?.lat || "";
    const lng = req.body?.lng || "";
    const isAdvertisement =
      req.body?.isAdvertisement === "true" ||
      req.body?.isAdvertisement === true ||
      false;

    let pollData = null;
    const isAdult = containsAdultContent(content);
    let thumbnailPath = null;

    if (req.body?.poll) {
      try {
        const parsed = JSON.parse(req.body.poll);
        pollData = {
          question: parsed.question,
          options: parsed.options
            .filter((opt) => opt.trim() !== "")
            .map((opt) => ({
              text: opt,
              votes: [],
            })),
        };
      } catch (err) {
        console.log("Poll parse error:", err);
      }
    }

    console.log("\nCREATE POST START ");

    // const pathToUrl = (filePath) => {
    //   if (!filePath) return null;
    //   let normalizedPath = filePath.replace(/\\/g, "/");
    //   const uploadsIndex = normalizedPath.indexOf("uploads/");
    //   if (uploadsIndex >= 0) {
    //     return normalizedPath.substring(uploadsIndex);
    //   }
    //   return normalizedPath;
    // };

    // ===== PROCESS MEDIA FILES =====
    // const media = files.map((file, index) => {
    //   const isVideo = file.mimetype?.startsWith("video/");
    //   const isGif = file.mimetype === "image/gif" || file.originalname?.endsWith(".gif");

    //   // Check if file has compression data
    //   if (file.compressed && file.mimetype?.startsWith("image/")) {
    //     console.log(`✅ Using compressed image: ${file.originalname}`);

    //     const mediaItem = {
    //       fileId: path.parse(file.filename).name,
    //       originalName: file.originalname,
    //       type: isGif ? "gif" : "image",
    //       image: {
    //         thumbnail: pathToUrl(file.compressed.thumbnail),
    //         medium: pathToUrl(file.compressed.medium),
    //         full: pathToUrl(file.compressed.full),
    //         originalSize: file.compressed.originalSize,
    //         compressedSize: file.compressed.compressedSize,
    //         compressionRatio: file.compressed.compressionRatio,
    //         format: file.compressed.format,
    //         uploadedAt: new Date(),
    //       },
    //     };

    //     console.log(`  📊 Compression: ${file.compressed.compressionRatio}% saved`);
    //     return mediaItem;
    //   }
    //   // Video - keep original for now (will add transcoding later)
    //   else if (isVideo && file.compressed?.type === "video") {
    //     console.log(`Video transcode in use: ${file.originalname} `);

    //     // Convert video variants to URLs
    //     const convertedVariants = {};
    //     if (file.compressed.variants) {
    //       Object.entries(file.compressed.variants).forEach(([key, value]) => {
    //         convertedVariants[key] = pathToUrl(value);
    //       });
    //     }

    //     const mediaItem = {
    //       fileId: path.parse(file.filename).name,
    //       originalName: file.originalname,
    //       type: "video",
    //       video: {
    //         thumbnail: pathToUrl(file.compressed.thumbnail) || null,
    //         variants : convertedVariants,
    //         duration: file.compressed.info?.duration || 0,
    //         resolution: {
    //           width : file.compressed.info?.video?.width || 0,
    //           height : file.compressed.info?.video?.height || 0,
    //         },
    //         fps: file.compressed.info?.video?.fps || 0,
    //         codec : file.compressed.info?.video?.codec ||  "",
    //         originalSize : file.compressed.originalSize || 0,
    //         uploadedAt: new  Date()
    //       },
    //     };

    //     // if (index === 0 && videoFile) {
    //     //   try {
    //     //     const normalizedPath = thumbnailPath?.replace(/\\/g, "/");
    //     //     const uploadsIndex = normalizedPath?.indexOf("uploads/");
    //     //     if (uploadsIndex >= 0) {
    //     //       mediaItem.video.thumbnail = normalizedPath.substring(uploadsIndex);
    //     //     }
    //     //   } catch (err) {
    //     //     console.error("❌ Error processing video thumbnail:", err.message);
    //     //   }
    //     // }
    //     return mediaItem;
    //   }
    //   // Fallback for other files (shouldn't happen with image-only middleware)
    //   else {
    //     console.log(`⚠️ Uncompressed file: ${file.originalname}`);

    //     return {
    //       fileId: path.parse(file.filename).name,
    //       originalName: file.originalname,
    //       type: isGif ? "gif" : isVideo ? "video" : "image",
    //     };
    //   }
    // });

    // Validate that all files are from Cloudinary (middleware validation)
    if (!req.allFilesFromCloudinary && files.length > 0) {
      console.error("❌ SECURITY: Files not processed through Cloudinary!");
      return res.status(500).json({
        message: "File upload system error - files not processed correctly",
      });
    }

    // Helper to validate Cloudinary URL
    const isCloudinaryUrl = (url) => {
      if (!url || typeof url !== "string") return false;
      return url.includes("cloudinary.com") || url.startsWith("https://res.cloudinary.com");
    };

    let media;
    try {
      // Validate that all files are from Cloudinary (middleware validation)
      if (!req.allFilesFromCloudinary && files.length > 0) {
        console.error("❌ SECURITY: Files not processed through Cloudinary!");
        return res.status(500).json({
          message: "File upload system error - files not processed correctly",
        });
      }

      media = files.map((file) => {
      const isVideo = file.mimetype?.startsWith("video/");
      const isGif =
        file.mimetype === "image/gif" || file.originalname?.endsWith(".gif");

      // Cloudinary image upload result
      if (file.compressed && file.mimetype?.startsWith("image/")) {
        console.log(`✅ Using Cloudinary image: ${file.originalname}`);

        // Validate Cloudinary URLs
        if (!isCloudinaryUrl(file.compressed.full)) {
          throw new Error(
            `Invalid image URL for ${file.originalname}: not a Cloudinary URL`
          );
        }

        return {
          fileId: file.cloudinaryPublicId || file.originalname,
          originalName: file.originalname,
          type: isGif ? "gif" : "image",
          image: {
            thumbnail: file.compressed.thumbnail, // Cloudinary URL
            medium: file.compressed.medium, // Cloudinary URL
            full: file.compressed.full, // Cloudinary URL
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: 0,
            format: "webp",
            uploadedAt: new Date(),
          },
        };

        console.log("=== CREATE POST DEBUG ===");
        console.log("files count:", files.length);
        if (files.length > 0) {
          files.forEach((f, i) => {
            console.log(`file[${i}]:`, {
              originalname: f.originalname,
              mimetype: f.mimetype,
              hasBuffer: !!f.buffer,
              bufferSize: f.buffer?.length,
              path: f.path,
              cloudinaryUrl: f.cloudinaryUrl,
              cloudinaryPublicId: f.cloudinaryPublicId,
              hasCompressed: !!f.compressed,
              compressed: f.compressed
                ? JSON.stringify(f.compressed).substring(0, 200)
                : null,
            });
          });
        }
        console.log("=========================");
      }

      // Cloudinary video upload result
      else if (isVideo && file.compressed?.type === "video") {
        console.log(`✅ Using Cloudinary video: ${file.originalname}`);

        // Validate Cloudinary URLs
        if (!isCloudinaryUrl(file.compressed.thumbnail)) {
          throw new Error(
            `Invalid video URL for ${file.originalname}: not a Cloudinary URL`
          );
        }

        return {
          fileId: file.cloudinaryPublicId || file.originalname,
          originalName: file.originalname,
          type: "video",
          video: {
            thumbnail: file.compressed.thumbnail || null, // Cloudinary URL
            variants: file.compressed.variants || {}, // Cloudinary URLs
            duration: file.compressed.info?.duration || 0,
            resolution: {
              width: file.compressed.info?.width || 0,
              height: file.compressed.info?.height || 0,
            },
            fps: 0,
            codec: "",
            originalSize: file.size || 0,
            uploadedAt: new Date(),
          },
        };
      }

      // ❌ NO FALLBACK ALLOWED - All files MUST be from Cloudinary
      else {
        throw new Error(
          `File ${file.originalname} was not properly processed through Cloudinary`
        );
      }
    });

    console.log("📦 Media array prepared:", media.length, "items");
    } catch (mediaErr) {
      console.error("❌ Media processing error:", mediaErr.message);
      return res.status(400).json({
        message: "Media processing failed",
        error: mediaErr.message,
      });
    }

    const audience = ["public", "friends", "private"].includes(
      req.body?.audience,
    )
      ? req.body.audience
      : "public";

    // HANDLE MENTIONS
    let mentionsData = [];
    if (req.body?.mentions) {
      try {
        const parsed = Array.isArray(req.body.mentions)
          ? req.body.mentions
          : JSON.parse(req.body.mentions);
        mentionsData = parsed.map((m) => ({
          name: m.name,
          user: m.user || m.userId || m._id,
        }));
      } catch (err) {
        console.log("Mentions parse error:", err);
      }
    }

    let taggedUserIds = [];
    if (req.body?.tags) {
      taggedUserIds = Array.isArray(req.body.tags)
        ? req.body.tags
        : [req.body.tags];
    }

    const allHashtags = [
      ...new Set([...extractHashtags(caption), ...extractHashtags(content)]),
    ];

    const location = locationName
      ? {
          name: locationName,
          coordinates:
            lat && lng
              ? { lat: parseFloat(lat), lng: parseFloat(lng) }
              : undefined,
        }
      : undefined;

    let verifiedTagIds = [];
    if (taggedUserIds.length > 0) {
      const poster = await User.findById(req.user._id).select("friends");
      const friendIdStrings = poster.friends.map((id) => id.toString());
      verifiedTagIds = taggedUserIds.filter((id) =>
        friendIdStrings.includes(id.toString()),
      );
    }

    // CREATE POST
    const post = new Post({
      user: req.user._id,
      caption,
      content,
      media,
      hashtags: allHashtags,
      tags: verifiedTagIds,
      mentions: mentionsData,
      poll: pollData,
      location,
      audience,
      isAdult,
      isAdvertisement,
      allowDownload:
        req.body?.allowDownload !== "false" &&
        req.body?.allowDownload !== false,
    });

    await post.save();
    await post.populate("user", "firstName lastName avatar");
    await post.populate("tags", "firstName lastName avatar");
    await post.populate("mentions.user", "firstName lastName avatar");

    // Create notifications for tagged users
    if (verifiedTagIds.length > 0) {
      const senderUser = await User.findById(req.user._id).select(
        "firstName lastName",
      );
      const senderName = `${senderUser.firstName} ${senderUser.lastName}`;

      const notificationDocs = verifiedTagIds.map((recipientId) => ({
        recipient: recipientId,
        sender: req.user._id,
        type: "tag_in_post",
        post: post._id,
        message: `${senderName} tagged you in a post`,
        read: false,
      }));

      await Notification.insertMany(notificationDocs);
    }

    //  Create notifications for mentioned users
    if (mentionsData.length > 0) {
      for (const mention of mentionsData) {
        const mentionedUserId = mention.user;

        if (mentionedUserId.toString() !== req.user._id.toString()) {
          await createMentionNotification(
            mentionedUserId,
            req.user._id,
            post._id,
          );

          req.io.to(mentionedUserId.toString()).emit("mention_notification", {
            recipientId: mentionedUserId,
            senderId: req.user._id,
            postId: post._id,
          });
        }
      }
    }

    console.log(" Post created successfully");
    res.json({ message: "Post created", post });
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ message: err.message });
  }
}

// VOTING IN POLL
async function votingPoll(req, res) {
  try {
    const { postId, optionIndex } = req.body;

    const post = await Post.findById(postId);

    if (!post || !post.poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    const alreadyVoted = post.poll.options.some((opt) =>
      opt.votes.includes(req.user._id),
    );

    if (alreadyVoted) {
      return res.status(400).json({ message: "You have already voted" });
    }

    post.poll.options[optionIndex].votes.push(req.user._id);
    await post.save();

    return res.json(post.poll);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// Get Poll Voters
async function getPollVoters(req, res) {
  try {
    const { postId, optionIndex } = req.params;

    const post = await Post.findById(postId);

    if (!post || !post.poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    const option = post.poll.options[Number(optionIndex)];
    if (!option) {
      return res.status(404).json({ message: "Option not found" });
    }

    await Post.populate(post, {
      path: "poll.options.votes",
      select: "firstName lastName avatar",
    });

    const populatedOption = post.poll.options[Number(optionIndex)];

    return res.json({
      optionText: populatedOption.text,
      voters: populatedOption.votes,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

//  TOGGLE LIKE
async function toggleLike(req, res) {
  try {
    const userId = req.user._id;
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const existingLike = await Like.findOne({ user: userId, post: postId });
    let updatedPost;

    if (existingLike) {
      await Like.deleteOne({ user: userId, post: postId });
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { $inc: { likesCount: -1 } },
        { new: true },
      );
    } else {
      await Like.create({ user: userId, post: postId });
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { $inc: { likesCount: 1 } },
        { new: true },
      );

      req.io.to(post.user.toString()).emit("like_notification", {
        recipientId: post.user,
        senderId: userId,
        postId: postId,
      });
    }

    res.json({ liked: !existingLike, likesCount: updatedPost.likesCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function reactToPost(req, res) {
  const { type = "like" } = req.body;
  const userId = req.user._id;
  const postId = req.params.id;

  console.log("BODY:", req.body);

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  const existing = await Like.findOne({ user: userId, post: postId });

  if (existing) {
    if (existing.type === type) {
      await Like.deleteOne({ _id: existing._id });
      await Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });
      return res.json({ action: "removed" });
    } else {
      existing.type = type;
      await existing.save();
      return res.json({ action: "updated" });
    }
  } else {
    await Like.create({ user: userId, post: postId, type });
    await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });

    if (post.user.toString() !== userId.toString()) {
      await createLikeNotification(post.user, userId, postId);

      req.io.to(post.user.toString()).emit("like_notification", {
        recipientId: post.user,
        senderId: userId,
        postId: postId,
      });
    }

    return res.json({ action: "added" });
  }
}

//  DELETE POST
async function deletePost(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this post" });
    }
    await post.deleteOne();
    res.json({ message: "Post Deleted Successfully", postId: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

//  ADD COMMENT
async function addComment(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = await Comment.create({
      post: req.params.id,
      user: req.user._id,
      text: req.body.text,
    });

    await Post.findByIdAndUpdate(req.params.id, {
      $inc: { commentsCount: 1 },
    });

    if (post.user.toString() !== req.user._id.toString()) {
      await createCommentNotification(
        post.user,
        req.user._id,
        req.params.id,
        req.body.text,
      );

      req.io.to(post.user.toString()).emit("comment_notification", {
        recipientId: post.user,
        senderId: req.user._id,
        postId: req.params.id,
        commentContent: req.body.text,
      });
    }

    const comments = await Comment.find({ post: req.params.id })
      .populate("user", "firstName lastName profilePicture")
      .sort({ createdAt: -1 });

    res.status(201).json({ comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

//  REPLY ON COMMENT
async function replyOnComment(req, res) {
  try {
    const { text } = req.body;
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    comment.replies.push({ user: req.user._id, text });
    await comment.save();

    const updatedComment = await Comment.findById(commentId).populate(
      "replies.user",
      "firstName lastName profilePicture",
    );
    const populatedReply =
      updatedComment.replies[updatedComment.replies.length - 1];

    if (comment.user.toString() !== req.user._id.toString()) {
      await createReplyNotification(
        comment.user,
        req.user._id,
        comment.post,
        text,
      );

      req.io.to(comment.user.toString()).emit("reply_notification", {
        recipientId: comment.user,
        senderId: req.user._id,
        postId: comment.post,
        replyContent: text,
      });
    }

    res.status(201).json({ reply: populatedReply });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Delete Comment
async function deleteComment(req, res) {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });
    await comment.deleteOne();
    res.json({ commentId: req.params.commentId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Delete Reply
async function deleteReply(req, res) {
  try {
    const { commentId, replyId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    const reply = comment.replies.id(replyId);
    if (!reply) return res.status(404).json({ message: "Reply not found" });
    if (reply.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });
    reply.deleteOne();
    await comment.save();
    res.json({ replyId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

//  GET USER POSTS
async function getUserPosts(req, res) {
  try {
    const userId = req.params.userId;
    const requesterId = req.user._id;

    const posts = await Post.find({ user: userId })
      .populate("user", "firstName lastName avatar")
      .populate("mentions.user", "firstName lastName avatar")
      .populate("tags", "firstName lastName username avatar")
      .sort({ createdAt: -1 });

    // Debug log for first post with media
    if (posts.length > 0 && posts[0].media?.length > 0) {
      console.log(
        "📸 FIRST POST MEDIA STRUCTURE:",
        JSON.stringify(posts[0].media[0], null, 2),
      );
    }

    const postIds = posts.map((p) => p._id);
    const userLikes = await Like.find({
      user: requesterId,
      post: { $in: postIds },
    });
    const userReactionMap = {};
    userLikes.forEach((like) => {
      userReactionMap[like.post.toString()] = like.type;
    });

    const postsWithComments = await Promise.all(
      posts.map(async (post) => {
        const comments = await Comment.find({ post: post._id })
          .populate("user", "firstName lastName profilePicture")
          .populate("replies.user", "firstName lastName profilePicture");
        return {
          ...post.toObject(),
          comments,
          currentUserReaction: userReactionMap[post._id.toString()] || null,
        };
      }),
    );

    res.json({ posts: postsWithComments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Get Single Post
async function getPostById(req, res) {
  try {
    const post = await Post.findById(req.params.id)
      .populate("user", "firstName lastName avatar")
      .populate("mentions.user", "firstName lastName avatar")
      .populate("tags", "firstName lastName username avatar");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comments = await Comment.find({ post: post._id })
      .populate("user", "firstName lastName profilePicture")
      .populate("replies.user", "firstName lastName profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json({
      ...post.toObject(),
      comments,
    });
  } catch (error) {
    console.error("GET POST ERROR:", error);
    res.status(500).json({ message: error.message });
  }
}

// GET REACTIONS LIST FOR A POST
async function getPostReactions(req, res) {
  try {
    const reactions = await Like.find({ post: req.params.id })
      .populate("user", "firstName lastName avatar")
      .sort({ createdAt: -1 });
    res.json({ reactions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function addView(req, res) {
  try {
    const postId = req.params.id;
    const userId = req.user?._id;
    const duration = req.body?.duration || 0;

    console.log("View Track Request:", { postId, userId, duration });

    const post = await Post.findById(postId);

    if (!post) {
      console.log("Post not found:", postId);
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if post has videos
    const hasVideo = post.media && post.media.some((m) => m.type === "video");

    console.log("Post has video:", hasVideo, "Duration:", duration, "seconds");

    // Only count views if:
    // 1. Post has video AND duration >= 2 seconds
    // 2. If no video, don't count the view
    if (!hasVideo) {
      console.log(" Post has no video, view not counted");
      return res.status(200).json({
        views: post.views.count,
        message: "View counting only applies to videos",
      });
    }

    // Minimum watch duration to count as a view
    const MIN_WATCH_DURATION = 2; // seconds

    if (duration < MIN_WATCH_DURATION) {
      console.log(
        `Video played for ${duration}s, minimum ${MIN_WATCH_DURATION}s required`,
      );
      return res.status(200).json({
        views: post.views.count,
        message: `View not counted. Minimum ${MIN_WATCH_DURATION}s watch time required`,
      });
    }

    console.log(" Current views before:", post.views);

    if (!post.views.viewedBy) {
      post.views.viewedBy = [];
    }

    if (userId) {
      let existingView = null;

      existingView = post.views.viewedBy.find(
        (view) => view.user && view.user.toString() === userId.toString(),
      );

      if (
        !existingView &&
        post.views.viewedBy.some((v) => typeof v === "string" || v._id)
      ) {
        const userIdString = userId.toString();
        const viewIdIndex = post.views.viewedBy.findIndex(
          (v) => v.toString && v.toString() === userIdString,
        );
        if (viewIdIndex !== -1) {
          existingView = { found: true, index: viewIdIndex };
        }
      }

      if (!existingView) {
        post.views.viewedBy.push({
          user: userId,
          duration: duration,
          timestamp: new Date(),
        });
        post.views.count += 1;
        console.log("User view added (first time) with duration:", duration);
      } else if (existingView.found && existingView.index !== undefined) {
        console.log(
          " User already viewed (old structure) - view not counted again",
        );
      } else if (duration > (existingView.duration || 0)) {
        existingView.duration = duration;
        existingView.timestamp = new Date();
        console.log("User view updated with longer duration:", duration);
      } else {
        console.log("User already viewed this post (not counted again)");
      }
    } else {
      post.views.viewedBy.push({
        user: null,
        duration: duration,
        timestamp: new Date(),
      });
      post.views.count += 1;
      console.log("Guest view added with duration:", duration);
    }

    await post.save();

    console.log("Views after save:", post.views);

    res.status(200).json({
      views: post.views.count,
      message: "View counted successfully",
    });
  } catch (err) {
    console.error(" View tracking error:", err);
    res.status(500).json({ message: err.message });
  }
}

// PIN POST
async function pinPost(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to pin this post" });
    }

    post.isPinned = true;
    await post.save();

    res.json({ message: "Post pinned successfully", isPinned: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// UNPIN POST
async function unpinPost(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to unpin this post" });
    }

    post.isPinned = false;
    await post.save();

    res.json({ message: "Post unpinned successfully", isPinned: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getFeed,
  createPost,
  votingPoll,
  getPollVoters,
  deletePost,
  toggleLike,
  addComment,
  replyOnComment,
  getUserPosts,
  getPostById,
  reactToPost,
  deleteComment,
  deleteReply,
  getPostReactions,
  addView,
  pinPost,
  unpinPost,
};
