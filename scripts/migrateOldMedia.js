// // Run this in your terminal (locally, connected to MongoDB Atlas):
// // node scripts/migrateOldMedia.js

// require("dotenv").config();
// const mongoose = require("mongoose");

// async function migrate() {
//   await mongoose.connect(process.env.MONGO_URI);
//   console.log("✅ Connected to MongoDB");

//   const db = mongoose.connection.db;
//   const posts = db.collection("posts");

//   const allPosts = await posts.find({ "media.0": { $exists: true } }).toArray();
//   console.log(`Total posts with media: ${allPosts.length}`);

//   let fixed = 0;

//   for (const post of allPosts) {
//     let needsUpdate = false;

//     const updatedMedia = post.media.map((m) => {
//       const isLocalPath = (val) =>
//         typeof val === "string" &&
//         val.length > 0 &&
//         !val.startsWith("https://res.cloudinary.com");

//       let updated = { ...m };

//       // Fix legacy url field
//       if (isLocalPath(m.url)) { updated.url = null; needsUpdate = true; }

//       // Fix image fields
//       if (m.image) {
//         let img = { ...m.image };
//         if (isLocalPath(m.image.thumbnail)) { img.thumbnail = null; needsUpdate = true; }
//         if (isLocalPath(m.image.medium))    { img.medium = null;    needsUpdate = true; }
//         if (isLocalPath(m.image.full))      { img.full = null;      needsUpdate = true; }
//         updated.image = img;
//       }

//       // Fix video fields
//       if (m.video) {
//         let vid = { ...m.video };
//         if (isLocalPath(m.video.thumbnail)) { vid.thumbnail = null; needsUpdate = true; }
//         if (m.video.variants) {
//           let vars = { ...m.video.variants };
//           for (const [key, val] of Object.entries(m.video.variants)) {
//             if (isLocalPath(val)) { vars[key] = null; needsUpdate = true; }
//           }
//           vid.variants = vars;
//         }
//         updated.video = vid;
//       }

//       return updated;
//     });

//     if (needsUpdate) {
//       await posts.updateOne({ _id: post._id }, { $set: { media: updatedMedia } });
//       fixed++;
//       console.log(`Fixed post ${post._id}`);
//     }
//   }

//   console.log(`\n✅ Done. Fixed ${fixed} posts.`);
//   process.exit(0);
// }

// migrate().catch((e) => { console.error("❌ Failed:", e); process.exit(1); });





// FINAL MIGRATION — based on actual DB diagnosis
// Run: node scripts/migrateOldMedia.js

require("dotenv").config();
const mongoose = require("mongoose");

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const db = mongoose.connection.db;
  const posts = db.collection("posts");
  const allPosts = await posts.find({ "media.0": { $exists: true } }).toArray();

  console.log(`Total posts with media: ${allPosts.length}\n`);

  // A path is broken if it starts with "uploads" (local Render path)
  const isBrokenPath = (val) =>
    typeof val === "string" && val.startsWith("uploads");

  let fixed = 0;

  for (const post of allPosts) {
    let needsUpdate = false;

    const updatedMedia = post.media.map((m) => {
      let updated = { ...m };

      // Fix image fields
      if (m.image && typeof m.image === "object") {
        let img = { ...m.image };
        if (isBrokenPath(img.thumbnail)) { img.thumbnail = null; needsUpdate = true; }
        if (isBrokenPath(img.medium))    { img.medium    = null; needsUpdate = true; }
        if (isBrokenPath(img.full))      { img.full      = null; needsUpdate = true; }
        updated.image = img;
      }

      // Fix video fields
      if (m.video && typeof m.video === "object") {
        let vid = { ...m.video };
        if (isBrokenPath(vid.thumbnail)) { vid.thumbnail = null; needsUpdate = true; }

        if (vid.variants && typeof vid.variants === "object") {
          let vars = { ...vid.variants };
          for (const [key, val] of Object.entries(vars)) {
            if (isBrokenPath(val)) { vars[key] = null; needsUpdate = true; }
          }
          vid.variants = vars;
        }
        updated.video = vid;
      }

      return updated;
    });

    if (needsUpdate) {
      await posts.updateOne(
        { _id: post._id },
        { $set: { media: updatedMedia } }
      );
      fixed++;
      console.log(`✅ Fixed: ${post._id}`);
    }
  }

  console.log(`\n🎉 Done! Fixed: ${fixed}  |  Already clean: ${allPosts.length - fixed}`);
  process.exit(0);
}

migrate().catch((e) => { console.error("❌ Failed:", e); process.exit(1); });