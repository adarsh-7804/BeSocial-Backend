/**
 * ONE-TIME MIGRATION SCRIPT
 * Run this ONCE on your local machine (connected to your MongoDB Atlas):
 *   node scripts/fixOldMediaPaths.js
 *
 * What it does:
 * - Finds all posts where media URLs are local paths (not https://)
 * - Marks them with a flag so frontend can show "Media unavailable"
 * - Does NOT delete posts, only updates the media array
 */

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");

// Import your Post model - adjust path if needed
const { Post } = require("../models/post");

async function migrateOldPosts() {
  await connectDB();
  console.log("✅ Connected to MongoDB");

  // Find posts where any media url is NOT a cloudinary URL
  const posts = await Post.find({
    "media.0": { $exists: true },
  });

  console.log(`Found ${posts.length} posts with media`);

  let fixed = 0;
  let skipped = 0;

  for (const post of posts) {
    let needsUpdate = false;
    const updatedMedia = post.media.map((m) => {
      // Handle both string media and object media
      if (typeof m === "string") {
        if (!m.startsWith("https://res.cloudinary.com")) {
          needsUpdate = true;
          return "MEDIA_UNAVAILABLE"; // placeholder
        }
        return m;
      } else if (typeof m === "object" && m !== null) {
        // Object with url/path fields
        const urlField = m.url || m.path || m.full || "";
        if (urlField && !urlField.startsWith("https://res.cloudinary.com")) {
          needsUpdate = true;
          return { ...m.toObject ? m.toObject() : m, url: "MEDIA_UNAVAILABLE", path: "MEDIA_UNAVAILABLE" };
        }
        return m;
      }
      return m;
    });

    if (needsUpdate) {
      post.media = updatedMedia;
      await post.save();
      fixed++;
      console.log(`Fixed post ${post._id}`);
    } else {
      skipped++;
    }
  }

  console.log(`\n✅ Migration complete:`);
  console.log(`   Fixed: ${fixed} posts`);
  console.log(`   Skipped (already OK): ${skipped} posts`);
  process.exit(0);
}

migrateOldPosts().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});