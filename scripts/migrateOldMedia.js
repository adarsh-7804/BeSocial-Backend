// Run this in Render Shell:
// node scripts/migrateOldMedia.js

require("dotenv").config();
const mongoose = require("mongoose");

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected");

  const db = mongoose.connection.db;
  const posts = db.collection("posts");

  // Find all posts where media has a local "url" field (old format)
  const oldPosts = await posts.find({
    "media.url": { $exists: true, $not: /^https:\/\// }
  }).toArray();

  console.log(`Found ${oldPosts.length} posts with broken local media`);

  for (const post of oldPosts) {
    const updatedMedia = post.media.map((m) => {
      if (m.url && !m.url.startsWith("https://")) {
        // Mark as unavailable - file is gone from Render
        return {
          ...m,
          url: null,
          thumbnailUrl: null,
          _broken: true,
        };
      }
      return m;
    });

    await posts.updateOne(
      { _id: post._id },
      { $set: { media: updatedMedia } }
    );
  }

  console.log(`✅ Migrated ${oldPosts.length} posts`);
  process.exit(0);
}

migrate().catch((e) => { console.error(e); process.exit(1); });