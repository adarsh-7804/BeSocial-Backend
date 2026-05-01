require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const posts = await db.collection("posts").find({ "media.0": { $exists: true } }).toArray();

  console.log(`Total posts with media: ${posts.length}\n`);

  posts.forEach((p) => {
    p.media.forEach((m) => {
      console.log("POST:", p._id);
      console.log("  url:", m.url);
      console.log("  image:", JSON.stringify(m.image));
      console.log("  video:", JSON.stringify(m.video));
      console.log("---");
    });
  });

  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });