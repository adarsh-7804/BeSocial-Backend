const router = require("express").Router();
const scheduledPostController = require("../controllers/scheduledPostController");
const authUserMiddleware = require("../middlewares/authmiddleware");
const upload = require("../middlewares/upload");

// POST   /api/scheduled-posts/schedule  → schedule a new post
// GET    /api/scheduled-posts/          → get user's scheduled posts
// GET    /api/scheduled-posts/:id       → get single scheduled post
// PUT    /api/scheduled-posts/:id       → update scheduled post
// DELETE /api/scheduled-posts/:id       → cancel scheduled post

router.post(
  "/schedule",
  authUserMiddleware,
  upload,
  scheduledPostController.schedulePost
);

router.get("/", authUserMiddleware, scheduledPostController.getScheduledPosts);

router.get(
  "/:id",
  authUserMiddleware,
  scheduledPostController.getScheduledPostById
);

router.put(
  "/:id",
  authUserMiddleware,
  upload,
  scheduledPostController.updateScheduledPost
);

router.delete(
  "/:id",
  authUserMiddleware,
  scheduledPostController.cancelScheduledPost
);

module.exports = router;