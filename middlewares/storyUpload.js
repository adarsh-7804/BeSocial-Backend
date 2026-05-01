// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// // Create stories uploads directory if it doesn't exist
// const storiesDir = "uploads/stories";
// if (!fs.existsSync(storiesDir)) {
//   fs.mkdirSync(storiesDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "uploads/stories/");
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix =
//       Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(
//       null,
//       "story-" +
//         uniqueSuffix +
//         path.extname(file.originalname)
//     );
//   },
// });

// const fileFilter = (req, file, cb) => {
//   const allowedTypes = [
//     "image/jpeg",
//     "image/png",
//     "image/gif",
//     "image/webp",
//     "video/mp4",
//     "video/quicktime",
//     "video/webm",
//   ];

//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error("Invalid file type for story. Allowed: images and videos."), false);
//   }
// };

// const multerUpload = multer({
//   storage: storage,
//   fileFilter,
//   limits: {
//     fileSize: 50 * 1024 * 1024, // 50MB limit for stories
//   },
// });

// // Single file upload for stories
// const storyUpload = (req, res, next) => {
//   multerUpload.single("media")(req, res, function (err) {
//     if (err) {
//       return res.status(400).json({ message: err.message });
//     }
//     next();
//   });
// };

// module.exports = storyUpload;






const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const multerUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "video/mp4", "video/quicktime", "video/webm",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type for story. Allowed: images and videos."), false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
};

const storyUpload = (req, res, next) => {
  multerUpload.single("media")(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (req.file) {
      try {
        const isVideo = req.file.mimetype.startsWith("video/");
        const result = await uploadToCloudinary(req.file.buffer, {
          folder: "besocial/stories",
          resource_type: isVideo ? "video" : "image",
          transformation: isVideo
            ? [{ quality: "auto" }]
            : [{ quality: "auto", fetch_format: "auto" }],
        });

        req.file = {
          ...req.file,
          path: result.secure_url,
          cloudinaryUrl: result.secure_url,
          cloudinaryPublicId: result.public_id,
        };

        console.log(`✅ Story uploaded to Cloudinary: ${result.secure_url}`);
      } catch (uploadErr) {
        console.error("Story Cloudinary upload error:", uploadErr);
        return res.status(500).json({ message: "Story media upload failed" });
      }
    }

    next();
  });
};

module.exports = storyUpload;