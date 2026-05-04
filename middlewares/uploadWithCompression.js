// // const multer = require("multer");
// // const path = require("path");
// // const fs = require("fs");
// // const { compressImage, getVideoInfo, generateVideoThumbnail, transcodeVideo } = require("../utils/mediaProcessor");
// // const { type } = require("os");

// // const uploadDir = "uploads";
// // const processedDir = "uploads/processed";

// // if (!fs.existsSync(uploadDir)) {
// //   fs.mkdirSync(uploadDir, { recursive: true });
// // }

// // if (!fs.existsSync(processedDir)) {
// //   fs.mkdirSync(processedDir, { recursive: true });
// // }

// // const storage = multer.diskStorage({
// //   destination: function (req, file, cb) {
// //     cb(null, uploadDir + "/");
// //   },
// //   filename: function (req, file, cb) {
// //     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
// //     cb(
// //       null,
// //       file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
// //     );
// //   },
// // });

// // const fileFilter = (req, file, cb) => {
// //   const allowedImageTypes = [
// //     "image/jpeg",
// //     "image/png",
// //     "image/gif",
// //     "image/webp",
// //   ];

// //   const allowedVideoTypes = [
// //     "video/mp4",
// //     "video/quicktime",
// //     "video/webm",
// //     "video/avi",
// //   ];

// //   const isImage = allowedImageTypes.includes(file.mimetype);
// //   const isVideo = allowedVideoTypes.includes(file.mimetype);

// //   if (isImage || isVideo) {
// //     cb(null, true);
// //   } else {
// //     cb(new Error("Only images are allowed"), false);
// //   }
// // };

// // const multerUpload = multer({
// //   storage: storage,
// //   fileFilter,
// //   limits: {
// //     fileSize: 1000 * 1024 * 1024,
// //   },
// // });

// // // Process uploaded images with compression
// // const uploadWithCompression = (req, res, next) => {
// //   console.log("UPLOAD MIDDLEWARE CALLED");
  
// //   // Use .fields() to capture both files and text fields from FormData
// //   multerUpload.fields([
// //     { name: 'media', maxCount: 10 }
// //   ])(req, res, async function (err) {
// //     if (err) {
// //       return res.status(400).json({ message: err.message });
// //     }

// //     // Merge text fields from FormData into req.body for easier access
// //     // Multer stores FormData fields in req.body when using .fields()
// //     console.log("After multer - req.body:", req.body);
// //     console.log("After multer - req.files:", req.files ? Object.keys(req.files) : "no files");

// //     // Process if files exist
// //     if (req.files && req.files.media && req.files.media.length > 0) {
// //       try {
// //         const quality = req.body?.quality || "medium";
// //         const processedFiles = [];

// //         for (const file of req.files.media) {
// //           try {
// //             const isImage = file.mimetype.startsWith("image/");
// //             const isVideo = file.mimetype.startsWith("video/");

// //             const fileBaseName = path.parse(file.filename).name;
// //             const fileProcessDir = path.join(processedDir, fileBaseName);

// //             if (isImage) {
// //               const compressionResult = await compressImage(
// //                 file.path,
// //                 fileProcessDir,
// //                 quality,
// //               );

// //               processedFiles.push({
// //                 ...file,
// //                 compressed: compressionResult,
// //                 processedPath: compressionResult.full,
// //               });

// //               console.log(
// //                 `Image processed: ${file.originalname} - Saved ${compressionResult.compressionRatio}%`,
// //               );
// //             } else if (isVideo) {
// //                 console.log("Starting video transcoding")

// //                 const videoInfo = await getVideoInfo(file.path);

// //                 const thumbnailPath = path.join(fileProcessDir, `${fileBaseName}-thumb.jpg`);
// //                 await generateVideoThumbnail(file.path, thumbnailPath);

// //                 const transcodedVideos = await transcodeVideo(file.path, fileProcessDir, quality)

// //                 processedFiles.push({
// //                     ...file,
// //                     compressed: {
// //                         type: "video",
// //                         thumbnail: thumbnailPath,
// //                         variants: transcodedVideos,
// //                         info: videoInfo,
// //                         originalSize: file.size
// //                     },
// //                     processedPath: transcodeVideo["720p"] || transcodedVideos["360p"]
// //                 }) 

// //                 console.log(`Video Processed ${file.originalname}`)
// //             } 
// //           } catch (err) {
// //             console.error(
// //               `⚠️ Error compressing ${file.originalname}: `,
// //               err.message,
// //             );

// //             processedFiles.push({
// //               ...file,
// //               compressed: null,
// //               error: err.message,
// //               processedPath: file.path,
// //             });
// //           }
// //         }
// //         // Store processed files back for controller to access
// //         req.files = processedFiles;
// //       } catch (err) {
// //         console.error("❌ File processing error", err);
// //       }
// //     } else {
// //       // No files uploaded, but still need to convert req.files.media (if exists) to req.files array format
// //       if (!req.files) {
// //         req.files = [];
// //       } else if (req.files && !Array.isArray(req.files)) {
// //         // If using .fields(), files are in req.files.media
// //         req.files = (req.files.media || []);
// //       }
// //     }
// //     next();
// //   });
// // };

// // module.exports = uploadWithCompression;


// const multer = require("multer");
// const { CloudinaryStorage } = require("multer-storage-cloudinary");
// const cloudinary = require("../config/cloudinary");

// // ─── IMAGE STORAGE ────────────────────────────────────────────────────────────
// const imageStorage = new CloudinaryStorage({
//   cloudinary,
//   params: async (req, file) => {
//     return {
//       folder: "besocial/posts",
//       allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
//       transformation: [{ quality: "auto", fetch_format: "auto" }],
//       resource_type: "image",
//     };
//   },
// });

// // ─── VIDEO STORAGE ────────────────────────────────────────────────────────────
// const videoStorage = new CloudinaryStorage({
//   cloudinary,
//   params: async (req, file) => {
//     return {
//       folder: "besocial/posts/videos",
//       resource_type: "video",
//       transformation: [{ quality: "auto" }],
//     };
//   },
// });

// // ─── DYNAMIC STORAGE (picks image or video based on mimetype) ─────────────────
// // multer-storage-cloudinary doesn't support dynamic resource_type easily,
// // so we use memoryStorage + manual upload instead
// const memStorage = multer.memoryStorage();

// const multerUpload = multer({
//   storage: memStorage,
//   fileFilter: (req, file, cb) => {
//     const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
//     const allowedVideoTypes = ["video/mp4", "video/quicktime", "video/webm", "video/avi"];
//     if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only images and videos are allowed"), false);
//     }
//   },
//   limits: { fileSize: 1000 * 1024 * 1024 }, // 1GB
// });

// // ─── UPLOAD FILE BUFFER TO CLOUDINARY ─────────────────────────────────────────
// const uploadToCloudinary = (buffer, options) => {
//   return new Promise((resolve, reject) => {
//     const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
//       if (error) return reject(error);
//       resolve(result);
//     });
//     uploadStream.end(buffer);
//   });
// };

// // ─── MAIN MIDDLEWARE ──────────────────────────────────────────────────────────
// const uploadWithCompression = (req, res, next) => {
//   console.log("UPLOAD MIDDLEWARE CALLED");

//   multerUpload.fields([{ name: "media", maxCount: 10 }])(req, res, async function (err) {
//     if (err) {
//       return res.status(400).json({ message: err.message });
//     }

//     console.log("After multer - req.body:", req.body);
//     console.log("After multer - req.files:", req.files ? Object.keys(req.files) : "no files");

//     if (req.files && req.files.media && req.files.media.length > 0) {
//       try {
//         const processedFiles = [];

//         for (const file of req.files.media) {
//           try {
//             const isImage = file.mimetype.startsWith("image/");
//             const isVideo = file.mimetype.startsWith("video/");

//             let cloudinaryResult;

//             if (isImage) {
//               cloudinaryResult = await uploadToCloudinary(file.buffer, {
//                 folder: "besocial/posts",
//                 resource_type: "image",
//                 transformation: [{ quality: "auto", fetch_format: "auto" }],
//               });

//               processedFiles.push({
//                 ...file,
//                 // Cloudinary URLs - use these in your DB
//                 path: cloudinaryResult.secure_url,
//                 cloudinaryUrl: cloudinaryResult.secure_url,
//                 cloudinaryPublicId: cloudinaryResult.public_id,
//                 cloudinaryWidth: cloudinaryResult.width,
//                 cloudinaryHeight: cloudinaryResult.height,
//                 compressed: {
//                   full: cloudinaryResult.secure_url,
//                   medium: cloudinaryResult.secure_url.replace(
//                     "/upload/",
//                     "/upload/w_800,q_auto,f_auto/"
//                   ),
//                   thumbnail: cloudinaryResult.secure_url.replace(
//                     "/upload/",
//                     "/upload/w_400,q_auto,f_auto/"
//                   ),
//                   compressionRatio: 0,
//                 },
//                 processedPath: cloudinaryResult.secure_url,
//               });

//               console.log(`✅ Image uploaded to Cloudinary: ${cloudinaryResult.secure_url}`);

//             } else if (isVideo) {
//               cloudinaryResult = await uploadToCloudinary(file.buffer, {
//                 folder: "besocial/posts/videos",
//                 resource_type: "video",
//                 transformation: [{ quality: "auto" }],
//               });

//               // Generate thumbnail URL from Cloudinary automatically
//               const thumbnailUrl = cloudinaryResult.secure_url
//                 .replace("/upload/", "/upload/so_0,w_800,f_jpg/")
//                 .replace(/\.[^/.]+$/, ".jpg");

//               processedFiles.push({
//                 ...file,
//                 path: cloudinaryResult.secure_url,
//                 cloudinaryUrl: cloudinaryResult.secure_url,
//                 cloudinaryPublicId: cloudinaryResult.public_id,
//                 compressed: {
//                   type: "video",
//                   thumbnail: thumbnailUrl,
//                   variants: {
//                     "720p": cloudinaryResult.secure_url,
//                     "360p": cloudinaryResult.secure_url.replace(
//                       "/upload/",
//                       "/upload/w_640,q_auto/"
//                     ),
//                   },
//                   info: {
//                     duration: cloudinaryResult.duration,
//                     width: cloudinaryResult.width,
//                     height: cloudinaryResult.height,
//                   },
//                   originalSize: file.size,
//                 },
//                 processedPath: cloudinaryResult.secure_url,
//               });

//               console.log(`✅ Video uploaded to Cloudinary: ${cloudinaryResult.secure_url}`);
//             }

//           } catch (fileErr) {
//             console.error(`⚠️ Error uploading ${file.originalname} to Cloudinary:`, fileErr.message);
//             processedFiles.push({
//               ...file,
//               compressed: null,
//               error: fileErr.message,
//               processedPath: null,
//             });
//           }
//         }

//         req.files = processedFiles;
//       } catch (err) {
//         console.error("❌ File processing error", err);
//         return res.status(500).json({ message: "Media upload failed" });
//       }
//     } else {
//       if (!req.files) {
//         req.files = [];
//       } else if (req.files && !Array.isArray(req.files)) {
//         req.files = req.files.media || [];
//       }
//     }

//     next();
//   });
// };

// module.exports = uploadWithCompression;







const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const multerUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const allowedVideoTypes = ["video/mp4", "video/quicktime", "video/webm", "video/avi"];
    if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images and videos are allowed"), false);
    }
  },
  limits: { fileSize: 1000 * 1024 * 1024 }, // 1GB
});

// ─── UPLOAD FILE BUFFER TO CLOUDINARY ─────────────────────────────────────────
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    uploadStream.end(buffer);
  });
};

// ─── MAIN MIDDLEWARE ──────────────────────────────────────────────────────────
const uploadWithCompression = (req, res, next) => {
  console.log("UPLOAD MIDDLEWARE CALLED");

  multerUpload.fields([{ name: "media", maxCount: 10 }])(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    console.log("After multer - req.body:", req.body);
    console.log("After multer - req.files:", req.files ? Object.keys(req.files) : "no files");

    if (req.files && req.files.media && req.files.media.length > 0) {
      try {
        const processedFiles = [];
        const failedFiles = [];

        for (const file of req.files.media) {
          try {
            const isImage = file.mimetype.startsWith("image/");
            const isVideo = file.mimetype.startsWith("video/");

            if (!isImage && !isVideo) {
              failedFiles.push(`${file.originalname}: Unsupported file type`);
              continue;
            }

            let cloudinaryResult;

            if (isImage) {
              cloudinaryResult = await uploadToCloudinary(file.buffer, {
                folder: "besocial/posts",
                resource_type: "image",
                transformation: [{ quality: "auto", fetch_format: "auto" }],
              });

              if (!cloudinaryResult.secure_url) {
                failedFiles.push(`${file.originalname}: No Cloudinary URL returned`);
                continue;
              }

              processedFiles.push({
                ...file,
                path: cloudinaryResult.secure_url,
                cloudinaryUrl: cloudinaryResult.secure_url,
                cloudinaryPublicId: cloudinaryResult.public_id,
                cloudinaryWidth: cloudinaryResult.width,
                cloudinaryHeight: cloudinaryResult.height,
                compressed: {
                  full: cloudinaryResult.secure_url,
                  medium: cloudinaryResult.secure_url.replace(
                    "/upload/",
                    "/upload/w_800,q_auto,f_auto/"
                  ),
                  thumbnail: cloudinaryResult.secure_url.replace(
                    "/upload/",
                    "/upload/w_400,q_auto,f_auto/"
                  ),
                  compressionRatio: 0,
                },
                processedPath: cloudinaryResult.secure_url,
              });

              console.log(`✅ Image uploaded to Cloudinary: ${cloudinaryResult.secure_url}`);

            } else if (isVideo) {
              cloudinaryResult = await uploadToCloudinary(file.buffer, {
                folder: "besocial/posts/videos",
                resource_type: "video",
                transformation: [{ quality: "auto" }],
              });

              if (!cloudinaryResult.secure_url) {
                failedFiles.push(`${file.originalname}: No Cloudinary URL returned`);
                continue;
              }

              // Generate thumbnail URL from Cloudinary automatically
              const thumbnailUrl = cloudinaryResult.secure_url
                .replace("/upload/", "/upload/so_0,w_800,f_jpg/")
                .replace(/\.[^/.]+$/, ".jpg");

              processedFiles.push({
                ...file,
                path: cloudinaryResult.secure_url,
                cloudinaryUrl: cloudinaryResult.secure_url,
                cloudinaryPublicId: cloudinaryResult.public_id,
                compressed: {
                  type: "video",
                  thumbnail: thumbnailUrl,
                  variants: {
                    "720p": cloudinaryResult.secure_url,
                    "360p": cloudinaryResult.secure_url.replace(
                      "/upload/",
                      "/upload/w_640,q_auto/"
                    ),
                  },
                  info: {
                    duration: cloudinaryResult.duration,
                    width: cloudinaryResult.width,
                    height: cloudinaryResult.height,
                  },
                  originalSize: file.size,
                },
                processedPath: cloudinaryResult.secure_url,
              });

              console.log(`✅ Video uploaded to Cloudinary: ${cloudinaryResult.secure_url}`);
            }

          } catch (fileErr) {
            console.error(`❌ Error uploading ${file.originalname} to Cloudinary:`, fileErr.message);
            failedFiles.push(`${file.originalname}: ${fileErr.message}`);
          }
        }

        // If any files failed, return error
        if (failedFiles.length > 0) {
          console.error("❌ Some files failed to upload:", failedFiles);
          return res.status(400).json({
            message: "Failed to upload some files to Cloudinary",
            details: failedFiles,
          });
        }

        // All files uploaded successfully to Cloudinary
        req.files = processedFiles;
        req.allFilesFromCloudinary = true; // Flag to verify in controller
      } catch (err) {
        console.error("❌ File processing error", err);
        return res.status(500).json({ message: "Media upload failed" });
      }
    } else {
      // No files uploaded, set empty array
      req.files = [];
      req.allFilesFromCloudinary = true;
    }

    next();
  });
};

module.exports = uploadWithCompression;