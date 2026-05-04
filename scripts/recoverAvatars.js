// RECOVER AVATARS & COVER IMAGES
// Run: node scripts/recoverAvatars.js

require("dotenv").config();
const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");

const UPLOADS_DIR = path.join(__dirname, "../uploads");

const uploadToCloudinary = (filePath, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "image",
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
};

async function recoverAvatars() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB\n");

  const db = mongoose.connection.db;
  const users = db.collection("users");

  // Find all users with local paths (not cloudinary URLs)
  const allUsers = await users.find({
    $or: [
      { avatar: { $exists: true, $ne: null } },
      { coverImage: { $exists: true, $ne: null } }
    ]
  }).toArray();

  const isLocalPath = (val) =>
    typeof val === "string" &&
    val.length > 0 &&
    !val.startsWith("https://");

  let recovered = 0;
  let failed = 0;
  let skipped = 0;

  for (const user of allUsers) {
    let updates = {};

    // ── AVATAR ──────────────────────────────────────────────
    if (isLocalPath(user.avatar)) {
      // Extract filename from path like "uploads\96b394e4..."
      const filename = user.avatar.replace(/\\/g, "/").replace("uploads/", "").replace("uploads\\", "");
      const filePath = path.join(UPLOADS_DIR, filename);

      if (fs.existsSync(filePath)) {
        try {
          const result = await uploadToCloudinary(filePath, "besocial/avatars/recovered");
          updates.avatar = result.secure_url;
          console.log(`✅ Avatar recovered for ${user.firstName}: ${result.secure_url}`);
        } catch (err) {
          console.log(`❌ Avatar failed for ${user.firstName}: ${err.message}`);
          failed++;
        }
      } else {
        console.log(`⚠️  Avatar file not found for ${user.firstName}: ${filename}`);
        skipped++;
      }
    }

    // ── COVER IMAGE ──────────────────────────────────────────
    if (isLocalPath(user.coverImage)) {
      const filename = user.coverImage.replace(/\\/g, "/").replace("uploads/", "").replace("uploads\\", "");
      const filePath = path.join(UPLOADS_DIR, filename);

      if (fs.existsSync(filePath)) {
        try {
          const result = await uploadToCloudinary(filePath, "besocial/covers/recovered");
          updates.coverImage = result.secure_url;
          console.log(`✅ Cover recovered for ${user.firstName}: ${result.secure_url}`);
        } catch (err) {
          console.log(`❌ Cover failed for ${user.firstName}: ${err.message}`);
          failed++;
        }
      } else {
        console.log(`⚠️  Cover file not found for ${user.firstName}: ${filename}`);
        skipped++;
      }
    }

    // Save updates to MongoDB
    if (Object.keys(updates).length > 0) {
      await users.updateOne({ _id: user._id }, { $set: updates });
      recovered++;
      console.log(`📦 User updated: ${user.firstName} ${user.lastName}\n`);
    }
  }

  console.log("─────────────────────────────────");
  console.log(`✅ Recovered: ${recovered} users`);
  console.log(`⚠️  Skipped:  ${skipped} (file not found)`);
  console.log(`❌ Failed:    ${failed}`);
  process.exit(0);
}

recoverAvatars().catch(e => { console.error("❌ Script failed:", e); process.exit(1); });