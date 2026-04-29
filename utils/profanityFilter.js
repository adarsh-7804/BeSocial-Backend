const Filter = require("bad-words");

const filter = new Filter();

// filter.addWords("sex", "xxx", "nude", "porn", "18+", "nsfw");

const containsAdultContent = (text) => {
  if (!text) return false;
  return filter.isProfane(text);
};

module.exports = { containsAdultContent };