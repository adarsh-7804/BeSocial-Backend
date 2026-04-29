const mongoose = require("mongoose");

const scheduledPostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    caption: {
      type: String,
      maxlength: 100,
      default: "",
    },

    content: {
      type: String,
      maxlength: 2000,
      default: "",
    },

    media: [
      {
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ["image", "video", "gif"],
          required: true,
        },
      },
    ],

    hashtags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],

    locationName: {
      type: String,
      default: "",
    },

    coordinates: {
      lat: Number,
      lng: Number,
    },

    audience: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },

    scheduledAt: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "published", "failed", "cancelled"],
      default: "pending",
    },

    publishedPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },

    failureReason: {
      type: String,
      default: null,
    },

    allowDownload: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

scheduledPostSchema.index({ status: 1, scheduledAt: 1 });
scheduledPostSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("ScheduledPost", scheduledPostSchema);