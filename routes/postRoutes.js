const router = require('express').Router();
const postController = require('../controllers/postControllers');
const { sharePost } = require('../controllers/sharePostController');
const authUserMiddleware = require('../middlewares/authmiddleware');
const upload = require('../middlewares/upload');
const uploadWithCompression = require('../middlewares/uploadWithCompression')
const { Post } = require('../models/post');


// POSTS
router.post('/create', authUserMiddleware, uploadWithCompression, postController.createPost);
router.delete('/delete/:id', authUserMiddleware, postController.deletePost);

// FEED (ONLY ONE ROUTE)
router.get('/', authUserMiddleware, postController.getFeed);

// PIN/UNPIN POSTS
router.put('/:id/pin', authUserMiddleware, postController.pinPost);
router.put('/:id/unpin', authUserMiddleware, postController.unpinPost);

// INTERACTIONS
router.put('/:id/like', authUserMiddleware, postController.toggleLike);
router.put('/:id/react', authUserMiddleware, postController.reactToPost);
router.post('/:id/comment', authUserMiddleware, postController.addComment);
router.post('/:id/share', authUserMiddleware, sharePost);
router.put('/:id/view', authUserMiddleware, postController.addView);

// COMMENTS
router.post('/comment/:commentId/reply', authUserMiddleware, postController.replyOnComment);
router.delete('/comment/:commentId', authUserMiddleware, postController.deleteComment);
router.delete('/comment/:commentId/reply/:replyId', authUserMiddleware, postController.deleteReply);

// POLL
router.post('/vote', authUserMiddleware, upload, postController.votingPoll);
router.get('/:postId/poll/:optionIndex/voters', authUserMiddleware, postController.getPollVoters);

// HASHTAGS
router.get('/hashtag/:tag', authUserMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ hashtags: req.params.tag.toLowerCase() })
      .populate("user", "firstName lastName avatar")
      .populate("tags", "firstName lastName username")
      .sort({ createdAt: -1 });

    res.json({ posts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// TRENDING HASHTAGS
router.get('/trending/hashtags', authUserMiddleware, async (req, res) => {
  try {
    const trending = await Post.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $unwind: "$hashtags" },
      { $group: { _id: "$hashtags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { hashtag: "$_id", count: 1, _id: 0 } }
    ]);

    res.json({ trending });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// USER POSTS
router.get('/user/:userId', authUserMiddleware, postController.getUserPosts);

// REACTIONS
router.get('/:id/reactions', authUserMiddleware, postController.getPostReactions);

// KEEP THIS LAST
router.get('/:id', authUserMiddleware, postController.getPostById);

module.exports = router;