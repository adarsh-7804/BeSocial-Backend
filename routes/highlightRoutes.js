const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authmiddleware");
const {
  createHighlight, getHighlights, getSingleHighlight, addStoryToHighlight,
  removeStoryFromHighlight, updateHighlight, deleteHighlight,
} = require("../controllers/highlightController");

router.use(authMiddleware);

router.post("/", createHighlight);
router.get("/", getHighlights);
router.get("/:highlightId", authMiddleware, getSingleHighlight);
router.post("/:highlightId/add-story", addStoryToHighlight);
router.delete("/:highlightId/remove-story/:storyId", removeStoryFromHighlight);
router.put("/:highlightId", updateHighlight);
router.delete("/:highlightId", deleteHighlight);

module.exports = router;
