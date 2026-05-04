// Profile Upload Middleware - Avatar & Cover Image to Cloudinary
// ─────────────────────────────────────────────────────────────────────────────

const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
};

const multerUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const profileUpload = (req, res, next) => {
  multerUpload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ])(req, res, async function (err) {
    if (err) return res.status(400).json({ message: err.message });

    try {
      const errors = [];

      // Upload avatar to Cloudinary if provided
      if (req.files?.avatar?.[0]) {
        try {
          const file = req.files.avatar[0];
          const result = await uploadToCloudinary(file.buffer, {
            folder: "besocial/avatars",
            resource_type: "image",
            transformation: [{ width: 400, height: 400, crop: "fill", quality: "auto", fetch_format: "auto" }],
          });
          
          if (!result.secure_url) {
            errors.push("Avatar: No URL returned from Cloudinary");
          } else {
            // Override file path with Cloudinary URL
            req.files.avatar[0].path = result.secure_url;
            req.files.avatar[0].cloudinaryUrl = result.secure_url;
            req.files.avatar[0].cloudinaryPublicId = result.public_id;
            console.log("✅ Avatar uploaded to Cloudinary:", result.secure_url);
          }
        } catch (avatarErr) {
          console.error("❌ Avatar upload error:", avatarErr.message);
          errors.push(`Avatar upload failed: ${avatarErr.message}`);
        }
      }

      // Upload coverImage to Cloudinary if provided
      if (req.files?.coverImage?.[0]) {
        try {
          const file = req.files.coverImage[0];
          const result = await uploadToCloudinary(file.buffer, {
            folder: "besocial/covers",
            resource_type: "image",
            transformation: [{ width: 1200, height: 400, crop: "fill", quality: "auto", fetch_format: "auto" }],
          });
          
          if (!result.secure_url) {
            errors.push("Cover image: No URL returned from Cloudinary");
          } else {
            req.files.coverImage[0].path = result.secure_url;
            req.files.coverImage[0].cloudinaryUrl = result.secure_url;
            req.files.coverImage[0].cloudinaryPublicId = result.public_id;
            console.log("✅ Cover image uploaded to Cloudinary:", result.secure_url);
          }
        } catch (coverErr) {
          console.error("❌ Cover image upload error:", coverErr.message);
          errors.push(`Cover image upload failed: ${coverErr.message}`);
        }
      }

      // If any errors, return them
      if (errors.length > 0) {
        console.error("❌ Profile upload errors:", errors);
        return res.status(500).json({
          message: "Failed to upload profile images",
          details: errors,
        });
      }

      // Mark that all files are from Cloudinary
      req.allFilesFromCloudinary = true;
    } catch (uploadErr) {
      console.error("❌ Profile upload error:", uploadErr);
      return res.status(500).json({ message: "Image upload failed" });
    }

    next();
  });
};

module.exports = profileUpload;