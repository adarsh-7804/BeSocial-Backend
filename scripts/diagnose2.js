require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  
  // Get the 3 most recent posts
  const posts = await db.collection("posts")
    .find({ "media.0": { $exists: true } })
    .sort({ createdAt: -1 })
    .limit(3)
    .toArray();

  console.log(`Showing 3 most recent posts with media:\n`);

  posts.forEach((p) => {
    console.log("POST:", p._id, "| created:", p.createdAt);
    p.media.forEach((m, i) => {
      console.log(`  media[${i}]:`);
      console.log(`    type:    `, m.type);
      console.log(`    url:     `, m.url);
      console.log(`    fileId:  `, m.fileId);
      console.log(`    image:   `, JSON.stringify(m.image));
      console.log(`    video:   `, JSON.stringify(m.video));
    });
    console.log("---");
  });

  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });