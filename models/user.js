const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    phoneNumber: String,
    password: { type: String, required: true },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    dob: Date,

    agreeToTerms: {
      type: Boolean,
      required: true,
    },

    bio: {
      type: String,
      maxlength: 200,
      default: "",
    },

    website: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    tags: [
      {
        type: String,
      },
    ],

    avatar: {
      type: String,
      default: "",
    },

    coverImage: {
      type: String,
      default: "",
    },

    showEmail: {
      type: Boolean,
      default: false,
    },

    showPhone: {
      type: Boolean,
      default: false,
    },

    isAccountVerified: {
      type: Boolean,
      default: false,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    resetPasswordOtp: String,
    resetPasswordOtpExpires: Date,

    refreshToken: String,

    isActive: {
      type: Boolean,
      default: true,
    },

    deactivatedAt: Date,

    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    friendRequestsSent: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    friendRequestsReceived: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    followers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    following: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    referralCode: {
      type: String,
      unique: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    referredUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Users whose stories are muted
    mutedStories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // For Chat

    onlineStatus: {
      type: String,
      enum: ["online", "offline"],
      default: "offline"
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    blockedUser:[ {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],

    archivedConversation: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation"
      }
    ]
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

module.exports = User;
