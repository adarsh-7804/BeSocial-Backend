const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads directory if it doesn't exist
const uploadsDir = "uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname +
        "-" +
        uniqueSuffix +
        path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // For Image
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    // For Video
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/avi",
    // For Files
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "text/plain",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${ file.mimetype }`), false);
  }
};

const multerUpload = multer({
  storage: storage,
  fileFilter,
  limits: {
    fileSize: 150 * 1024 * 1024,
  },
});

// 👇 IMPORTANT: wrap it
const upload = (req, res, next) => {
  multerUpload.array("media", 10)(req, res, function (err) {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

module.exports = upload;