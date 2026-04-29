const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authmiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  getOrCreateConversation,
  getUserConversations,
  createGroupConversation,
  updateGroupName,
  updateGroupProfilePic,
  removeMemberFromGroup,
  searchConversations,
  muteConversation,
  unmuteConversation,
  archiveConversation,
  unarchiveConversation,
  getArchivedConversations,
} = require("../controllers/conversationController");

// Setup multer for group profile picture upload
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
      "group-pic-" +
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
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, png, gif, webp)"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

router.use(protect);

router.post("/", getOrCreateConversation);
router.get("/", getUserConversations);
router.get("/search", searchConversations);
router.post("/group", createGroupConversation);
router.put("/update-group-name", updateGroupName);
router.put(
  "/update-group-profile-pic",
  upload.single("groupProfilePic"),
  updateGroupProfilePic
);
router.post("/remove-member", removeMemberFromGroup);
router.post("/mute", muteConversation);
router.post("/unmute", unmuteConversation);
router.post("/archive", archiveConversation);
router.post("/unarchive", unarchiveConversation);
router.get("/archived", getArchivedConversations);

module.exports = router;
