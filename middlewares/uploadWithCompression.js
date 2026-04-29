const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { compressImage, getVideoInfo, generateVideoThumbnail, transcodeVideo } = require("../utils/mediaProcessor");
const { type } = require("os");

const uploadDir = "uploads";
const processedDir = "uploads/processed";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(processedDir)) {
  fs.mkdirSync(processedDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir + "/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  const allowedVideoTypes = [
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/avi",
  ];

  const isImage = allowedImageTypes.includes(file.mimetype);
  const isVideo = allowedVideoTypes.includes(file.mimetype);

  if (isImage || isVideo) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed"), false);
  }
};

const multerUpload = multer({
  storage: storage,
  fileFilter,
  limits: {
    fileSize: 1000 * 1024 * 1024,
  },
});

// Process uploaded images with compression
const uploadWithCompression = (req, res, next) => {
  console.log("UPLOAD MIDDLEWARE CALLED");
  
  // Use .fields() to capture both files and text fields from FormData
  multerUpload.fields([
    { name: 'media', maxCount: 10 }
  ])(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    // Merge text fields from FormData into req.body for easier access
    // Multer stores FormData fields in req.body when using .fields()
    console.log("After multer - req.body:", req.body);
    console.log("After multer - req.files:", req.files ? Object.keys(req.files) : "no files");

    // Process if files exist
    if (req.files && req.files.media && req.files.media.length > 0) {
      try {
        const quality = req.body?.quality || "medium";
        const processedFiles = [];

        for (const file of req.files.media) {
          try {
            const isImage = file.mimetype.startsWith("image/");
            const isVideo = file.mimetype.startsWith("video/");

            const fileBaseName = path.parse(file.filename).name;
            const fileProcessDir = path.join(processedDir, fileBaseName);

            if (isImage) {
              const compressionResult = await compressImage(
                file.path,
                fileProcessDir,
                quality,
              );

              processedFiles.push({
                ...file,
                compressed: compressionResult,
                processedPath: compressionResult.full,
              });

              console.log(
                `Image processed: ${file.originalname} - Saved ${compressionResult.compressionRatio}%`,
              );
            } else if (isVideo) {
                console.log("Starting video transcoding")

                const videoInfo = await getVideoInfo(file.path);

                const thumbnailPath = path.join(fileProcessDir, `${fileBaseName}-thumb.jpg`);
                await generateVideoThumbnail(file.path, thumbnailPath);

                const transcodedVideos = await transcodeVideo(file.path, fileProcessDir, quality)

                processedFiles.push({
                    ...file,
                    compressed: {
                        type: "video",
                        thumbnail: thumbnailPath,
                        variants: transcodedVideos,
                        info: videoInfo,
                        originalSize: file.size
                    },
                    processedPath: transcodeVideo["720p"] || transcodedVideos["360p"]
                }) 

                console.log(`Video Processed ${file.originalname}`)
            } 
          } catch (err) {
            console.error(
              `⚠️ Error compressing ${file.originalname}: `,
              err.message,
            );

            processedFiles.push({
              ...file,
              compressed: null,
              error: err.message,
              processedPath: file.path,
            });
          }
        }
        // Store processed files back for controller to access
        req.files = processedFiles;
      } catch (err) {
        console.error("❌ File processing error", err);
      }
    } else {
      // No files uploaded, but still need to convert req.files.media (if exists) to req.files array format
      if (!req.files) {
        req.files = [];
      } else if (req.files && !Array.isArray(req.files)) {
        // If using .fields(), files are in req.files.media
        req.files = (req.files.media || []);
      }
    }
    next();
  });
};

module.exports = uploadWithCompression;
