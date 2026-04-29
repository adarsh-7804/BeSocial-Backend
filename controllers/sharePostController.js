const Share = require("../models/share")
const { Post } = require("../models/post");
const { createShareNotification } = require("./Notificationcontroller");

async function sharePost(req, res) {
  try {
    const userId = req.user._id;
    const postId = req.params.id;

    const existingShare = await Share.findOne({
      user: userId,
      post: postId,
    });

    if (existingShare) {
      return res.status(200).json({
        message: "Already shared",
        alreadyShared: true,
      });
    }


    await Share.create({ user: userId, post: postId });

    
    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { sharesCount: 1 } },
      { new: true }
    ).populate("user", "firstName lastName avatar");

    if (post?.user?._id && post.user._id.toString() !== userId.toString()) {
      await createShareNotification(post.user._id, userId, postId);

      if (req.io) {
        req.io.to(post.user._id.toString()).emit("share_notification", {
          recipientId: post.user._id,
          senderId: userId,
          postId: postId,
        });
      }
    }

    res.json({
      post,
      alreadyShared: false,
    });
  } catch (err) {
    res.status(500).json({ message: "Error sharing post" });
  }
}

module.exports = {
  sharePost
};