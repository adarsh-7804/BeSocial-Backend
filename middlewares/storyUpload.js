const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create stories uploads directory if it doesn't exist
const storiesDir = "uploads/stories";
if (!fs.existsSync(storiesDir)) {
  fs.mkdirSync(storiesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/stories/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      "story-" +
        uniqueSuffix +
        path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "video/webm",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type for story. Allowed: images and videos."), false);
  }
};

const multerUpload = multer({
  storage: storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for stories
  },
});

// Single file upload for stories
const storyUpload = (req, res, next) => {
  multerUpload.single("media")(req, res, function (err) {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

module.exports = storyUpload;
