const SavedPost = require("../models/savedPost");
const { Post } = require("../models/post");
const Comment = require("../models/comment");

async function getPostWithComments(postId) {
  const post = await Post.findById(postId)
    .populate("user", "firstName lastName avatar")
    .populate("tags", "firstName lastName username avatar");

  if (!post) return null;

  const comments = await Comment.find({ post: postId })
    .populate("user", "firstName lastName profilePicture")
    .populate("replies.user", "firstName lastName profilePicture")
    .sort({ createdAt: -1 });

  return { ...post.toObject(), comments };
}

async function savePost(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if already saved
    const existingSave = await SavedPost.findOne({ user: userId, post: postId });
    if (existingSave) {
      return res.status(400).json({ message: "Post already saved" });
    }

    // Create saved post
    await SavedPost.create({ user: userId, post: postId });

    const savedPost = await SavedPost.findOne({ user: userId, post: postId })
      .populate({
        path: "post",
        populate: [
          { path: "user", select: "firstName lastName avatar" },
          { path: "tags", select: "firstName lastName username avatar" },
        ],
      });

    res.status(201).json({ message: "Post saved", savedPost });
  } catch (err) {
    console.error("Save post error:", err);
    res.status(500).json({ message: err.message });
  }
}

async function unsavePost(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const savedPost = await SavedPost.findOne({ user: userId, post: postId });
    if (!savedPost) {
      return res.status(404).json({ message: "Saved post not found" });
    }

    await savedPost.deleteOne();
    res.json({ message: "Post unsaved", postId });
  } catch (err) {
    console.error("Unsave post error:", err);
    res.status(500).json({ message: err.message });
  }
}

async function getSavedPosts(req, res) {
  try {
    const userId = req.user._id;

    const savedPosts = await SavedPost.find({ user: userId })
      .populate({
        path: "post",
        populate: [
          { path: "user", select: "firstName lastName avatar" },
          { path: "tags", select: "firstName lastName username avatar" },
        ],
      })
      .sort({ createdAt: -1 });
      
    const savedPostsWithComments = await Promise.all(
      savedPosts.map(async (saved) => {
        const postWithComments = await getPostWithComments(saved.post._id);
        return {
          ...saved.toObject(),
          post: postWithComments || saved.post,
        };
      })
    );

    res.json({ savedPosts: savedPostsWithComments });
  } catch (err) {
    console.error("Get saved posts error:", err);
    res.status(500).json({ message: err.message });
  }
}

async function checkSavedStatus(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const saved = await SavedPost.findOne({ user: userId, post: postId });
    res.json({ isSaved: !!saved });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  savePost,
  unsavePost,
  getSavedPosts,
  checkSavedStatus,
};