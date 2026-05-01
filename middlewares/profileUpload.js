// This is the fix for your user profile upload middleware
// wherever you handle avatar and coverImage uploads

// ADD this to your config/cloudinary.js (already exists, just confirming)
// const cloudinary = require("cloudinary").v2;
// cloudinary.config({ ... });

// ─────────────────────────────────────────────────────────────
// Find the middleware used in your user/auth routes for 
// avatar and coverImage uploads. It likely looks like:
//
//   const upload = multer({ storage: multer.diskStorage({...}) })
//   router.put('/update', upload.fields([{name:'avatar'}, {name:'coverImage'}]), ...)
//
// Replace that middleware with this:
// ─────────────────────────────────────────────────────────────

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
      // Upload avatar to Cloudinary if provided
      if (req.files?.avatar?.[0]) {
        const file = req.files.avatar[0];
        const result = await uploadToCloudinary(file.buffer, {
          folder: "besocial/avatars",
          resource_type: "image",
          transformation: [{ width: 400, height: 400, crop: "fill", quality: "auto", fetch_format: "auto" }],
        });
        // Override file path with Cloudinary URL
        req.files.avatar[0].path = result.secure_url;
        req.files.avatar[0].cloudinaryUrl = result.secure_url;
        console.log("✅ Avatar uploaded to Cloudinary:", result.secure_url);
      }

      // Upload coverImage to Cloudinary if provided
      if (req.files?.coverImage?.[0]) {
        const file = req.files.coverImage[0];
        const result = await uploadToCloudinary(file.buffer, {
          folder: "besocial/covers",
          resource_type: "image",
          transformation: [{ width: 1200, height: 400, crop: "fill", quality: "auto", fetch_format: "auto" }],
        });
        req.files.coverImage[0].path = result.secure_url;
        req.files.coverImage[0].cloudinaryUrl = result.secure_url;
        console.log("✅ Cover uploaded to Cloudinary:", result.secure_url);
      }
    } catch (uploadErr) {
      console.error("Profile upload error:", uploadErr);
      return res.status(500).json({ message: "Image upload failed" });
    }

    next();
  });
};

module.exports = profileUpload;