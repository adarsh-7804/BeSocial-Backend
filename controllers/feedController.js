const { Post } = require("../models/post");
const User = require("../models/user");
const Like = require("../models/like");
const Comment = require("../models/comment");
const { getHiddenPostIds } = require("../utils/feedFilters")

//  Helper function to inject ads after every 5 posts 
async function injectAdsIntoPosts(posts, userId, page = 1, limit = 20) {
  const ADS_INTERVAL = 5;
  const result = [];
  let regularPostCount = 0;

  // First, get all advertisements from the database
  const ads = await Post.find({
    isAdvertisement: true,
    audience: "public"
  })
    .populate("user", "firstName lastName avatar")
    .populate("mentions.user", "firstName lastName avatar")
    .populate("tags", "firstName lastName avatar")
    .sort({ createdAt: -1 });

  if (ads.length === 0) {
    // No ads available, return posts as is
    return posts;
  }

  // Calculate global ad index based on page and posts seen
  // This ensures each page shows new ads, not repeating the same ones
  const postsBeforePage = (page - 1) * limit;
  let adIndex = Math.floor(postsBeforePage / ADS_INTERVAL);

  for (let i = 0; i < posts.length; i++) {
    result.push(posts[i]);
    regularPostCount++;

    // After every ADS_INTERVAL regular posts, insert an ad
    if (regularPostCount === ADS_INTERVAL) {
      const ad = ads[adIndex % ads.length]; // Cycle through ads if we run out
      const adEnriched = await enrichPosts([ad], userId);
      result.push(adEnriched[0]);
      adIndex++;
      regularPostCount = 0; // Reset counter
    }
  }

  return result;
}

async function enrichPosts(posts, userId) {
  const postIds = posts.map((p) => p._id || p.id);

  const userLikes = await Like.find({ user: userId, post: { $in: postIds } });
  const userReactionMap = {};
  userLikes.forEach((like) => {
    userReactionMap[like.post.toString()] = like.type;
  });

  // return Promise.all(
  // posts.map(async (post) => {
  // Handle both Mongoose documents and aggregate results
  // const postObj = post.toObject ? post.toObject() : { ...post };
  // const postId = postObj._id;
  // 
  // const comments = await Comment.find({ post: postId })
  // .populate("user", "firstName lastName avatar")
  // .populate("replies.user", "firstName lastName avatar")
  // .sort({ createdAt: -1 });
  // 
  // return {
  // ...postObj,
  // comments: comments || [],
  // currentUserReaction: userReactionMap[postId.toString()] || null,
  // };
  // }),
  // );

  const comment = await Comment.find({
    post: { $in: postIds },
  })
    .populate("user", "firstName lastName avatar")
    .populate("replies.user", "firstName lastName avatar")
    .sort({ createdAt: -1 });


  const commentsMap = {};

  comment.forEach((comment) => {
    const postId = comment.post.toString();

    if (!commentsMap[postId]) {
      commentsMap[postId] = [];
    }

    commentsMap[postId].push(comment);
  })

  return posts.map((post) => {
    const postObj = post.toObject ? post.toObject() : { ...post };
    const postId = postObj._id.toString();

    return {
      ...postObj,
      comments: commentsMap[postId] || [],
      currentUserReaction: userReactionMap[postId] || null,
    }
  })
}



async function getFollowingFeed(req, res, page, limit) {
  try {
    const userId = req.user._id;
    const currentUser = await User.findById(userId).select("friends");
    const friendIds = currentUser?.friends?.map((id) => id.toString()) || [];
    const hiddenPostIds = await getHiddenPostIds(userId);

    const posts = await Post.find({
      $or: [
        {
          audience: "public",
          isAdvertisement: { $ne: true },
          user: { $in: [...friendIds] },
          _id: { $nin: hiddenPostIds },

        },
        {
          audience: "friends",
          user: { $in: [...friendIds] },
          _id: { $nin: hiddenPostIds },
        },
        {
          audience: "private",
          user: userId,
          _id: { $nin: hiddenPostIds },
        },
      ],
    })
      .populate("user", "firstName lastName avatar")
      .populate("mentions.user", "firstName lastName avatar")
      .populate("tags", "firstName lastName avatar")
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const enriched = await enrichPosts(posts, userId);
    const withAds = await injectAdsIntoPosts(enriched, userId, page, limit);
    res.json({ posts: withAds });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getLatestFeed(req, res, page, limit) {
  try {
    const userId = req.user._id;
    const hiddenPostIds = await getHiddenPostIds(userId);

    const posts = await Post.find({
      audience: "public",
      isAdvertisement: { $ne: true },
      _id: { $nin: hiddenPostIds },
    })
      .populate("user", "firstName lastName avatar")
      .populate("mentions.user", "firstName lastName avatar")
      .populate("tags", "firstName lastName avatar")
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const enriched = await enrichPosts(posts, userId);
    const withAds = await injectAdsIntoPosts(enriched, userId, page, limit);
    res.json({ posts: withAds });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getForYouFeed(req, res, page, limit) {
  try {
    const userId = req.user._id;
    // const userPosts = await Post.find({ user: userId });
    const userPosts = await Post.find(
      { user: userId },
      "hashtags"
    ).lean();
    const hashtags = userPosts.flatMap((p) => p.hashtags);
    const hiddenPostIds = await getHiddenPostIds(userId);
    const currentUser = await User.findById(userId).select("friends");
    const friendIds = currentUser?.friends?.map((id) => id.toString()) || [];

    if (!hashtags.length) {
      return getLatestFeed(req, res, page, limit);
    }

    const posts = await Post.find({
      // hashtags: { $in: hashtags },
      // user: { $eq: userId , },
      isAdvertisement: { $ne: true },
      _id: { $nin: hiddenPostIds },
      $or: [
        { audience: "public", user: [...friendIds, userId] },
        { audience: "private", user: userId },
        { audience: "friends", user: [...friendIds, userId] }
      ],
    })
      .populate("user", "firstName lastName avatar")
      .populate("mentions.user", "firstName lastName avatar")
      .populate("tags", "firstName lastName avatar")
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const enriched = await enrichPosts(posts, userId);
    const withAds = await injectAdsIntoPosts(enriched, userId, page, limit);
    res.json({ posts: withAds });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getTrendingFeed(req, res, page, limit) {
  try {
    const userId = req.user._id;
    const hiddenPostIds = await getHiddenPostIds(userId);

    const posts = await Post.aggregate([
      // {
      //   $match: { audience: "public" },
      //    _id: { $nin: hiddenPostIds },
      // },
      {
        $match: {
          audience: "public",
          isAdvertisement: { $ne: true },
          _id: { $nin: hiddenPostIds }
        }
      },
      {
        $addFields: {
          score: {
            $subtract: [
              {
                $add: [
                  { $multiply: ["$likesCount", 3] },
                  { $multiply: ["$commentsCount", 5] },
                  { $multiply: ["$sharesCount", 7] },
                ],
              },
              {
                $divide: [
                  { $subtract: [new Date(), "$createdAt"] },
                  1000 * 60 * 60 * 24, //  1 day
                ],
              },
            ],
          },
        },
      },
      { $sort: { isPinned: -1, score: -1 } },
      { $skip: (page - 1) * Number(limit) },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "users",
          localField: "tags",
          foreignField: "_id",
          as: "tags",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "mentions.user",
          foreignField: "_id",
          as: "mentionsUsers",
        },
      },
      {
        $project: {
          _id: 1,
          isPinned: 1,
          isAdvertisement: 1,
          user: { _id: 1, firstName: 1, lastName: 1, avatar: 1 },
          media: 1,
          poll: 1,
          content: 1,
          caption: 1,
          mentions: 1,
          views: 1,
          hashtags: 1,
          tags: { _id: 1, firstName: 1, lastName: 1, avatar: 1 },
          location: 1,
          likesCount: 1,
          commentsCount: 1,
          sharesCount: 1,
          audience: 1,
          isAdult: 1,
          createdAt: 1,
          updatedAt: 1,
          score: 1,
          mentionsUsers: { _id: 1, firstName: 1, lastName: 1, avatar: 1 },
        },
      },
    ]);

    const enriched = await enrichPosts(posts, userId);
    const withAds = await injectAdsIntoPosts(enriched, userId, page, limit);
    res.json({ posts: withAds });
  } catch (err) {
    console.error("Trending Feed Error:", err);
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getFollowingFeed,
  getLatestFeed,
  getTrendingFeed,
  getForYouFeed,
};
