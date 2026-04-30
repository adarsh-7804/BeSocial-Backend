const Draft = require("../models/Draft");
const { Post } = require("../models/post");

//  Helper
function extractHashtags(text) {
  if (!text || typeof text !== "string") return [];
  const matches = text.match(/#(\w+)/g);
  return matches
    ? [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))]
    : [];
}

//  Save Draft
// POST /api/draft/save
// Accepts same multipart body as createPost + optional draftId (to overwrite)
async function saveDraft(req, res) {
  try {
    const {
      caption = "",
      content = "",
      locationName = "",
      lat = "",
      lng = "",
      draftId,
      audience = "public",
      allowDownload = true,
    } = req.body;

    const validAudience = ["public", "private", "friends"].includes(audience)
      ? audience : "public"; 

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

    const hashtags = [
      ...new Set([...extractHashtags(caption), ...extractHashtags(content)]),
    ];

    const draftData = {
      user: req.user._id,
      caption,
      content,
      locationName,
      coordinates:
        lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined,
      hashtags,
      audience: validAudience,
      allowDownload: allowDownload !== "false" && allowDownload !== false,
      // Only overwrite media if new files were uploaded
      ...(media.length > 0 && { media }),
    };

    let draft;

    if (draftId) {
      // Update existing draft
      draft = await Draft.findOneAndUpdate(
        { _id: draftId, user: req.user._id },
        draftData,
        { new: true },
      );
      if (!draft) {
        return res.status(404).json({ message: "Draft not found" });
      }
    } else {
      // Create new draft
      draft = await Draft.create(draftData);
    }

    res.status(201).json({ message: "Draft saved", draft });
  } catch (err) {
    console.error("Save draft error:", err);
    res.status(500).json({ message: err.message });
  }
}

//  Get All Drafts for current user
// GET /api/draft/
async function getDrafts(req, res) {
  try {
    const drafts = await Draft.find({ user: req.user._id }).sort({
      updatedAt: -1,
    });

    console.log("Logged in user:", req.user._id.toString());

    res.set("Cache-Control", "no-store");
    res.json({ drafts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

//  Delete Draft
// DELETE /api/draft/:id
async function deleteDraft(req, res) {
  try {
    const draft = await Draft.findById(req.params.id);

    if (!draft) return res.status(404).json({ message: "Draft not found" });

    if (draft.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await draft.deleteOne();
    res.json({ message: "Draft deleted", draftId: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

//  Publish Draft (converts draft → post, then deletes draft)
// POST /api/draft/:id/publish
async function publishDraft(req, res) {
  try {
    const draft = await Draft.findById(req.params.id);

    if (!draft) return res.status(404).json({ message: "Draft not found" });

    if (draft.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Build the post from saved draft data
    const post = new Post({
      user: req.user._id,
      caption: draft.caption,
      content: draft.content,
      media: draft.media,
      hashtags: draft.hashtags,
      tags: [],
      audience: draft.audience || "public",
      allowDownload: draft.allowDownload !== false,
      location: draft.locationName
        ? {
            name: draft.locationName,
            coordinates:
              draft.coordinates?.lat && draft.coordinates?.lng
                ? draft.coordinates
                : undefined,
          }
        : undefined,
    });

    await post.save();
    await post.populate("user", "firstName lastName avatar");

    // Remove the draft after publishing
    await draft.deleteOne();

    res.json({
      message: "Draft published successfully",
      post,
      draftId: req.params.id,
    });
  } catch (err) {
    console.error("Publish draft error:", err);
    res.status(500).json({ message: err.message });
  }
}

module.exports = { saveDraft, getDrafts, deleteDraft, publishDraft };
