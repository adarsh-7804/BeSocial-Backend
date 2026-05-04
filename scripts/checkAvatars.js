require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const users = await db.collection("users")
    .find({ avatar: { $exists: true, $ne: null } })
    .limit(5)
    .toArray();

  users.forEach(u => {
    console.log("name:", u.firstName, u.lastName);
    console.log("avatar:", u.avatar);
    console.log("cover:", u.coverImage);
    console.log("---");
  });

  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });