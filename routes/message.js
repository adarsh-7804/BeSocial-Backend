const express = require("express")
const router = express.Router();
const protect = require("../middlewares/authmiddleware")

const {
    sendMessage,
    getMessage,
    deleteMessage,
    markMessageAsRead,
    pinnedMessage,
    unpinnedMessage,
    getPinnedMessages,
    sendMediaMessage,
    editMessage,
    replyToMessage,
    forwardMessage
} = require("../controllers/messageController");
const upload = require("../middlewares/upload");

router.use(protect)

router.get("/:conversationId", getMessage)
router.post("/", sendMessage)
router.post("/media", upload, sendMediaMessage); 
router.delete("/:id", deleteMessage )
router.post("/read", markMessageAsRead)
router.post("/reply", replyToMessage)

// Pinned message route
router.post("/pin", pinnedMessage)
router.post("/unpin", unpinnedMessage)
router.post("/pinned/:conversationId", getPinnedMessages)

// Forward message route
router.post("/forward", forwardMessage)

router.put("/:id", editMessage)
module.exports = router








