const mongoose = require("mongoose");

const shareSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "User" 
    },
    post: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Post" 
    },
  },
  { 
    timestamps: true 
  }
);

shareSchema.index({ user: 1, post: 1 }, { unique: true });

module.exports = mongoose.model("Share", shareSchema);