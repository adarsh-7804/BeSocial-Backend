const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Support for multiple media types (image, video, gif)
    // media: [
    //   {
    //     url: {
    //       type: String,
    //       required: true,
    //     },
    //     type: {
    //       type: String,
    //       enum: ["image", "video", "gif"],
    //       required: true,
    //     },
    //     thumbnailUrl: {
    //       type: String,
    //       default: null,
    //     },
    //   },
    // ],

    media: [
      {
        fileId: String,
        originalName: String,
        type: {
          type: String,
          enum: ["image", "video", "gif"],
          required: true,
        },

        // For compressed images
        image: {
          thumbnail: String, 
          medium: String, 
          full: String, 
          originalSize: Number,
          compressedSize: Number,
          compressionRatio: Number,
          format: { type: String, default: "webp" },
          uploadedAt: { type: Date, default: Date.now },
        },

        // For transcoded videos
        video: {
          thumbnail: String, 
          variants: {
            "360p": String,
            "720p": String,
            "1080p": String,
          },
          duration: Number, 
          resolution: {
            width: Number,
            height: Number,
          },
          fps: Number,
          codec: String,
          originalSize: Number,
          uploadedAt: { type: Date, default: Date.now },
        },

        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    poll: {
      question: { type: String },
      options: [
        {
          text: String,
          votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        },
      ],
      expiresAt: { type: Date },
    },

    // Text-only post support
    content: {
      type: String,
      maxlength: 10000,
      default: "",
    },

    caption: {
      type: String,
      maxlength: 100,
    },

    mentions: [
      {
        name: String,
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    views: {
      count: {
        type: Number,
        default: 0,
      },
      viewedBy: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          duration: {
            type: Number, // Duration in seconds
            default: 0,
          },
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },

    // Hashtags extracted from content/caption
    hashtags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],

    // User mentions/tags (@username)
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Location tagging
    location: {
      name: {
        type: String,
        default: "",
      },
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    likesCount: {
      type: Number,
      default: 0,
    },

    commentsCount: {
      type: Number,
      default: 0,
    },

    sharesCount: {
      type: Number,
      default: 0,
    },

    audience: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },
    isAdult: {
      type: Boolean,
      default: false,
    },

    isAdvertisement: {
      type: Boolean,
      default: false,
    },

    isPinned: {
      type: Boolean,
      default: false,
    },

    allowDownload: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for searching
postSchema.index({ hashtags: 1 });
postSchema.index({ createdAt: -1 });

const Post = mongoose.model("Post", postSchema);

module.exports = { Post };
