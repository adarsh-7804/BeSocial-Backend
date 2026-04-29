const NotInterested = require("../models/notInterested");

async function getHiddenPostIds(userId) {
  const records = await NotInterested.find({ user: userId }).select("post");
  return records.map((r) => r.post);
}

module.exports = { getHiddenPostIds };