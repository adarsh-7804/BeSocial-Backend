#!/usr/bin/env node

/**
 * Migration Script: Fix all posts and users with "uploads/" paths
 * 
 * This script finds all records storing local "uploads/" paths and
 * flags them for re-upload or deletion.
 * 
 * Usage: node scripts/migrateToCloudinary.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/user");
const { Post } = require("../models/post");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/besocial");
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

async function migrateUsers() {
  console.log("\n📋 Scanning Users for 'uploads/' paths...");
  
  try {
    // Find users with avatar containing "uploads/"
    const usersWithBadAvatar = await User.find({
      avatar: { $regex: "uploads/", $options: "i" },
    });

    // Find users with coverImage containing "uploads/"
    const usersWithBadCover = await User.find({
      coverImage: { $regex: "uploads/", $options: "i" },
    });

    const totalBadUsers = new Set([
      ...usersWithBadAvatar.map((u) => u._id.toString()),
      ...usersWithBadCover.map((u) => u._id.toString()),
    ]).size;

    console.log(`Found ${totalBadUsers} users with local file paths`);

    if (usersWithBadAvatar.length > 0) {
      console.log(`  - ${usersWithBadAvatar.length} have bad avatar paths`);
      console.log("    Examples:", usersWithBadAvatar.slice(0, 2).map((u) => u.avatar));
    }

    if (usersWithBadCover.length > 0) {
      console.log(`  - ${usersWithBadCover.length} have bad cover image paths`);
      console.log("    Examples:", usersWithBadCover.slice(0, 2).map((u) => u.coverImage));
    }

    // Clear these fields (or set to default)
    if (totalBadUsers > 0) {
      const result = await User.updateMany(
        {
          $or: [
            { avatar: { $regex: "uploads/", $options: "i" } },
            { coverImage: { $regex: "uploads/", $options: "i" } },
          ],
        },
        {
          $unset: {
            avatar: "",
            coverImage: "",
          },
        }
      );

      console.log(`✅ Cleared ${result.modifiedCount} user records`);
    } else {
      console.log("✅ No users with local paths found");
    }
  } catch (err) {
    console.error("❌ Error migrating users:", err.message);
  }
}

async function migratePosts() {
  console.log("\n📋 Scanning Posts for 'uploads/' paths...");

  try {
    // Find posts with media containing "uploads/"
    const postsWithBadMedia = await Post.find({
      "media.image.thumbnail": { $regex: "uploads/", $options: "i" },
    }).select("_id media user");

    const postsWithBadImageFull = await Post.find({
      "media.image.full": { $regex: "uploads/", $options: "i" },
    }).select("_id media user");

    const postsWithBadVideoThumb = await Post.find({
      "media.video.thumbnail": { $regex: "uploads/", $options: "i" },
    }).select("_id media user");

    const totalBadPosts = new Set([
      ...postsWithBadMedia.map((p) => p._id.toString()),
      ...postsWithBadImageFull.map((p) => p._id.toString()),
      ...postsWithBadVideoThumb.map((p) => p._id.toString()),
    ]).size;

    console.log(`Found ${totalBadPosts} posts with local file paths`);

    if (postsWithBadMedia.length > 0) {
      console.log(`  - ${postsWithBadMedia.length} have bad media thumbnails`);
    }
    if (postsWithBadImageFull.length > 0) {
      console.log(`  - ${postsWithBadImageFull.length} have bad image full URLs`);
    }
    if (postsWithBadVideoThumb.length > 0) {
      console.log(`  - ${postsWithBadVideoThumb.length} have bad video thumbnails`);
    }

    // These posts have corrupted media - they should be deleted or re-uploaded
    if (totalBadPosts > 0) {
      console.log("\n⚠️  These posts have corrupted media and should be:");
      console.log("   1. Deleted (media cannot be recovered from local storage)");
      console.log("   2. Or users should re-upload media");
      console.log("\nRunning cleanup...");

      // Option A: Delete posts with corrupted media
      const deleteResult = await Post.deleteMany({
        $or: [
          { "media.image.thumbnail": { $regex: "uploads/", $options: "i" } },
          { "media.image.full": { $regex: "uploads/", $options: "i" } },
          { "media.video.thumbnail": { $regex: "uploads/", $options: "i" } },
        ],
      });

      console.log(`✅ Deleted ${deleteResult.deletedCount} posts with corrupted media`);

      // Option B: (Alternative) Mark media as invalid without deleting
      // await Post.updateMany(
      //   { "media.url": { $regex: "uploads/", $options: "i" } },
      //   { $set: { "media.$[].url": null, "media.$[].deleted": true } }
      // );
      // console.log(`✅ Marked ${result.modifiedCount} posts' media as invalid`);
    } else {
      console.log("✅ No posts with local paths found");
    }
  } catch (err) {
    console.error("❌ Error migrating posts:", err.message);
  }
}

async function generateReport() {
  console.log("\n📊 Migration Report:");
  console.log("════════════════════════════════════════════");

  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();

    console.log(`Total Users: ${totalUsers}`);
    console.log(`Total Posts: ${totalPosts}`);

    // Sample check - verify some records
    const sampleUser = await User.findOne({ avatar: { $exists: true, $ne: "" } });
    const samplePost = await Post.findOne({ "media.0": { $exists: true } });

    if (sampleUser?.avatar) {
      console.log(
        `\n✅ Sample user avatar URL: ${
          sampleUser.avatar.substring(0, 80) + "..."
        }`
      );
      const isCloudinary =
        sampleUser.avatar.includes("cloudinary.com") ||
        sampleUser.avatar.startsWith("https://res.cloudinary.com");
      console.log(`   Is Cloudinary URL: ${isCloudinary ? "YES ✅" : "NO ❌"}`);
    }

    if (samplePost?.media?.[0]?.image?.full) {
      console.log(
        `\n✅ Sample post media URL: ${
          samplePost.media[0].image.full.substring(0, 80) + "..."
        }`
      );
      const isCloudinary =
        samplePost.media[0].image.full.includes("cloudinary.com") ||
        samplePost.media[0].image.full.startsWith("https://res.cloudinary.com");
      console.log(`   Is Cloudinary URL: ${isCloudinary ? "YES ✅" : "NO ❌"}`);
    }

    console.log("\n════════════════════════════════════════════");
  } catch (err) {
    console.error("❌ Error generating report:", err.message);
  }
}

async function runMigration() {
  console.log("\n🚀 Starting Cloudinary Migration...");
  console.log("════════════════════════════════════════════\n");

  await connectDB();
  await migrateUsers();
  await migratePosts();
  await generateReport();

  console.log("\n✅ Migration complete!");
  process.exit(0);
}

// Run the migration
runMigration().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
