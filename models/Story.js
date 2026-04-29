const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Story content type
    type: {
      type: String,
      enum: ["image", "video", "text"],
      required: true,
    },

    // Media URL for image/video stories
    mediaUrl: {
      type: String,
      default: "",
    },

    // Text content for text-type stories
    textContent: {
      type: String,
      default: "",
      maxlength: 500,
    },

    // Text story styling
    textStyle: {
      backgroundColor: { type: String, default: "#8C5A3C" },
      fontColor: { type: String, default: "#FFFFFF" },
      fontSize: { type: Number, default: 24 },
      fontFamily: { type: String, default: "DM Sans" },
    },

    // Unique viewers - each user counted only once
    viewers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Reactions to the story
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        type: {
          type: String,
          enum: ["like", "love", "haha", "wow", "sad", "angry", "fire"],
          default: "like",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Replies to the story
    replies: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        text: {
          type: String,
          required: true,
          maxlength: 1000,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Privacy control
    privacy: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },

    // Whether this story is saved in a highlight (prevents cleanup deletion)
    isHighlighted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying of active stories
storySchema.index({ createdAt: -1 });
storySchema.index({ userId: 1, createdAt: -1 });

// Virtual to check if story is expired (older than 24 hours)
storySchema.virtual("isExpired").get(function () {
  const now = new Date();
  const expiryTime = new Date(this.createdAt.getTime() + 24 * 60 * 60 * 1000);
  return now > expiryTime;
});

// Virtual to get view count
storySchema.virtual("viewCount").get(function () {
  return this.viewers.length;
});

// Ensure virtuals are included in JSON output
storySchema.set("toJSON", { virtuals: true });
storySchema.set("toObject", { virtuals: true });

const Story = mongoose.model("Story", storySchema);

module.exports = Story;
