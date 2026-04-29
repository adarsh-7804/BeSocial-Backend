const mongoose = require("mongoose");

const highlightSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    description: {
      type: String,
      default: "",
      maxlength: 200,
    },

    // Cover image URL (defaults to first story's media)
    coverImage: {
      type: String,
      default: "",
    },

    // Array of story IDs saved to this highlight
    stories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
      },
    ],

    // Whether this highlight is publicly visible
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
highlightSchema.index({ userId: 1, createdAt: -1 });

const Highlight = mongoose.model("Highlight", highlightSchema);

module.exports = Highlight;
