const Highlight = require("../models/Highlight");
const Story = require("../models/Story");

// POST /api/highlights/
const createHighlight = async (req, res) => {
  try {
    const userId = req.user._id;
    const { title, description, coverImage } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: "Title is required" });
    const highlight = await Highlight.create({
      userId, title: title.trim(), description: description || "", coverImage: coverImage || "",
    });
    res.status(201).json({ message: "Highlight created", highlight });
  } catch (error) {
    console.error("Create highlight error:", error);
    res.status(500).json({ message: "Failed to create highlight" });
  }
};

// GET /api/highlights/
const getHighlights = async (req, res) => {
  try {
    const userId = req.user._id;
    const highlights = await Highlight.find({ userId })
      .populate({
        path: "stories",
        populate: [
          { path: "userId", select: "firstName lastName username avatar" },
          { path: "reactions.userId", select: "firstName lastName username avatar" },
          { path: "viewers.userId", select: "firstName lastName username avatar" },
          { path: "replies.userId", select: "firstName lastName username avatar" },
        ],
        options: { sort: { createdAt: -1 } },
      })
      .sort({ createdAt: -1 });
    res.json({ highlights });
  } catch (error) {
    console.error("Get highlights error:", error);
    res.status(500).json({ message: "Failed to fetch highlights" });
  }
};

const getSingleHighlight = async (req, res) => {
  try {
    const { highlightId } = req.params;

    const highlight = await Highlight.findById(highlightId)
      .populate({
        path: "stories",
        populate: [
          { path: "userId", select: "firstName lastName username avatar" },
          { path: "reactions.userId", select: "firstName lastName username avatar" },
          { path: "viewers.userId", select: "firstName lastName username avatar" },
          { path: "replies.userId", select: "firstName lastName username avatar" },
        ],
        options: { sort: { createdAt: -1 } },
      });

    if (!highlight) {
      return res.status(404).json({ message: "Highlight not found" });
    }

    res.json({ highlight });
  } catch (error) {
    console.error("Get single highlight error:", error);
    res.status(500).json({ message: "Failed to fetch highlight" });
  }
};

// POST /api/highlights/:highlightId/add-story
const addStoryToHighlight = async (req, res) => {
  try {
    const userId = req.user._id;
    const { highlightId } = req.params;
    const { storyId } = req.body;
    const highlight = await Highlight.findById(highlightId);
    if (!highlight) return res.status(404).json({ message: "Highlight not found" });
    if (highlight.userId.toString() !== userId.toString()) return res.status(403).json({ message: "Not authorized" });
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (story.userId.toString() !== userId.toString()) return res.status(403).json({ message: "Can only add your own stories" });
    if (highlight.stories.includes(storyId)) return res.status(400).json({ message: "Story already in highlight" });
    highlight.stories.push(storyId);
    if (!highlight.coverImage && story.mediaUrl) highlight.coverImage = story.mediaUrl;
    await highlight.save();
    // Mark story as highlighted so cleanup won't delete it
    await Story.findByIdAndUpdate(storyId, { isHighlighted: true });
    const populated = await Highlight.findById(highlightId).populate({
      path: "stories",
      populate: [
        { path: "userId", select: "firstName lastName username avatar" },
        { path: "reactions.userId", select: "firstName lastName username avatar" },
        { path: "viewers.userId", select: "firstName lastName username avatar" },
        { path: "replies.userId", select: "firstName lastName username avatar" },
      ],
    });
    res.json({ message: "Story added to highlight", highlight: populated });
  } catch (error) {
    console.error("Add story to highlight error:", error);
    res.status(500).json({ message: "Failed to add story" });
  }
};

// DELETE /api/highlights/:highlightId/remove-story/:storyId
const removeStoryFromHighlight = async (req, res) => {
  try {
    const userId = req.user._id;
    const { highlightId, storyId } = req.params;
    const highlight = await Highlight.findById(highlightId);
    if (!highlight) return res.status(404).json({ message: "Highlight not found" });
    if (highlight.userId.toString() !== userId.toString()) return res.status(403).json({ message: "Not authorized" });
    highlight.stories = highlight.stories.filter((s) => s.toString() !== storyId);
    await highlight.save();
    // Check if story is in any other highlight
    const otherHighlight = await Highlight.findOne({ stories: storyId });
    if (!otherHighlight) await Story.findByIdAndUpdate(storyId, { isHighlighted: false });
    res.json({ message: "Story removed from highlight", highlight });
  } catch (error) {
    console.error("Remove story error:", error);
    res.status(500).json({ message: "Failed to remove story" });
  }
};

// PUT /api/highlights/:highlightId
const updateHighlight = async (req, res) => {
  try {
    const userId = req.user._id;
    const { highlightId } = req.params;
    const { title, description, coverImage, isPublic } = req.body;
    const highlight = await Highlight.findById(highlightId);
    if (!highlight) return res.status(404).json({ message: "Highlight not found" });
    if (highlight.userId.toString() !== userId.toString()) return res.status(403).json({ message: "Not authorized" });
    if (title !== undefined) highlight.title = title;
    if (description !== undefined) highlight.description = description;
    if (coverImage !== undefined) highlight.coverImage = coverImage;
    if (isPublic !== undefined) highlight.isPublic = isPublic;
    await highlight.save();
    res.json({ message: "Highlight updated", highlight });
  } catch (error) {
    console.error("Update highlight error:", error);
    res.status(500).json({ message: "Failed to update highlight" });
  }
};

// DELETE /api/highlights/:highlightId
const deleteHighlight = async (req, res) => {
  try {
    const userId = req.user._id;
    const { highlightId } = req.params;
    const highlight = await Highlight.findById(highlightId);
    if (!highlight) return res.status(404).json({ message: "Highlight not found" });
    if (highlight.userId.toString() !== userId.toString()) return res.status(403).json({ message: "Not authorized" });
    // Unmark stories as highlighted if not in other highlights
    for (const storyId of highlight.stories) {
      const other = await Highlight.findOne({ _id: { $ne: highlightId }, stories: storyId });
      if (!other) await Story.findByIdAndUpdate(storyId, { isHighlighted: false });
    }
    await Highlight.findByIdAndDelete(highlightId);
    res.json({ message: "Highlight deleted", highlightId });
  } catch (error) {
    console.error("Delete highlight error:", error);
    res.status(500).json({ message: "Failed to delete highlight" });
  }
};

module.exports = { createHighlight, getSingleHighlight, getHighlights, addStoryToHighlight, removeStoryFromHighlight, updateHighlight, deleteHighlight };
