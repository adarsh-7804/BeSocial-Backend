// RECOVERY SCRIPT — uploads local processed files to Cloudinary + updates MongoDB
// Run: node scripts/recoverMedia.js

require("dotenv").config();
const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");

const PROCESSED_DIR = path.join(__dirname, "../uploads/processed");

const uploadToCloudinary = (filePath, folder, resourceType = "image") => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType,
      transformation: resourceType === "image"
        ? [{ quality: "auto", fetch_format: "auto" }]
        : [{ quality: "auto" }],
    }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
};

async function recover() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB\n");

  const db = mongoose.connection.db;
  const posts = db.collection("posts");

  // Get all posts where image URLs are null (broken)
  const brokenPosts = await posts.find({
    $or: [
      { "media.image.medium": null },
      { "media.video.variants.360p": null },
    ]
  }).toArray();

  console.log(`Found ${brokenPosts.length} posts to recover\n`);

  let recovered = 0;
  let failed = 0;

  for (const post of brokenPosts) {
    let postNeedsUpdate = false;
    const updatedMedia = [];

    for (const m of post.media) {
      let updated = { ...m };

      // ── IMAGE recovery ──────────────────────────────────────
      if (m.type === "image" || m.type === "gif") {
        // Find the folder using fileId
        const fileId = m.fileId;
        if (!fileId) { updatedMedia.push(updated); continue; }

        const folderPath = path.join(PROCESSED_DIR, fileId);
        if (!fs.existsSync(folderPath)) {
          console.log(`  ⚠️  Folder not found: ${fileId}`);
          updatedMedia.push(updated);
          continue;
        }

        try {
          const fullFile   = path.join(folderPath, `${fileId}-full.webp`);
          const mediumFile = path.join(folderPath, `${fileId}-medium.webp`);
          const thumbFile  = path.join(folderPath, `${fileId}-thumb.webp`);

          // Upload all 3 variants
          const [fullResult, mediumResult, thumbResult] = await Promise.all([
            fs.existsSync(fullFile)   ? uploadToCloudinary(fullFile,   "besocial/posts/recovered") : null,
            fs.existsSync(mediumFile) ? uploadToCloudinary(mediumFile, "besocial/posts/recovered") : null,
            fs.existsSync(thumbFile)  ? uploadToCloudinary(thumbFile,  "besocial/posts/recovered") : null,
          ]);

          updated.image = {
            ...m.image,
            full:      fullResult?.secure_url   || mediumResult?.secure_url || null,
            medium:    mediumResult?.secure_url || fullResult?.secure_url   || null,
            thumbnail: thumbResult?.secure_url  || mediumResult?.secure_url || null,
          };

          postNeedsUpdate = true;
          console.log(`  ✅ Image recovered: ${fileId}`);
        } catch (err) {
          console.log(`  ❌ Failed image: ${fileId} — ${err.message}`);
          failed++;
        }
      }

      // ── VIDEO recovery ──────────────────────────────────────
      else if (m.type === "video") {
        const fileId = m.fileId;
        if (!fileId) { updatedMedia.push(updated); continue; }

        const folderPath = path.join(PROCESSED_DIR, fileId);
        if (!fs.existsSync(folderPath)) {
          console.log(`  ⚠️  Folder not found: ${fileId}`);
          updatedMedia.push(updated);
          continue;
        }

        try {
          const video360  = path.join(folderPath, "video-360p.mp4");
          const video720  = path.join(folderPath, "video-720p.mp4");
          const thumbFile = path.join(folderPath, `${fileId}-thumb.jpg`);

          const [v360Result, v720Result, thumbResult] = await Promise.all([
            fs.existsSync(video360)  ? uploadToCloudinary(video360,  "besocial/posts/recovered/videos", "video") : null,
            fs.existsSync(video720)  ? uploadToCloudinary(video720,  "besocial/posts/recovered/videos", "video") : null,
            fs.existsSync(thumbFile) ? uploadToCloudinary(thumbFile, "besocial/posts/recovered") : null,
          ]);

          updated.video = {
            ...m.video,
            thumbnail: thumbResult?.secure_url || null,
            variants: {
              "360p": v360Result?.secure_url || null,
              "720p": v720Result?.secure_url || null,
            },
          };

          postNeedsUpdate = true;
          console.log(`  ✅ Video recovered: ${fileId}`);
        } catch (err) {
          console.log(`  ❌ Failed video: ${fileId} — ${err.message}`);
          failed++;
        }
      }

      updatedMedia.push(updated);
    }

    if (postNeedsUpdate) {
      await posts.updateOne(
        { _id: post._id },
        { $set: { media: updatedMedia } }
      );
      recovered++;
      console.log(`📦 Post updated: ${post._id}\n`);
    }
  }

  console.log("─────────────────────────────────");
  console.log(`✅ Recovered: ${recovered} posts`);
  console.log(`❌ Failed:    ${failed} items`);
  process.exit(0);
}

recover().catch(e => { console.error("❌ Script failed:", e); process.exit(1); });