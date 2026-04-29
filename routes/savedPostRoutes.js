const router = require("express").Router();
const savedPostController = require("../controllers/savedPostController");
const authUserMiddleware = require("../middlewares/authmiddleware");

// GET    /api/save/saved     → get all saved posts for logged-in user
// POST   /api/save/:postId   → save a post
// DELETE /api/save/:postId   → unsave a post
// GET    /api/save/check/:postId → check if post is saved (optional)

router.get("/saved", authUserMiddleware, savedPostController.getSavedPosts);
router.post("/:postId", authUserMiddleware, savedPostController.savePost);
router.delete("/:postId", authUserMiddleware, savedPostController.unsavePost);
router.get("/check/:postId", authUserMiddleware, savedPostController.checkSavedStatus);

module.exports = router;