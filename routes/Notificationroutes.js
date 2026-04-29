const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllRead,
  deleteNotification,
  createMessageNotification,
  getMessageNotifications,
  getNotificationsByType,
} = require("../controllers/Notificationcontroller");
const authMiddleware = require("../middlewares/authmiddleware");

// All notification routes require authentication
router.use(authMiddleware);

// GET  /api/notifications         
router.get("/", getNotifications);

// GET message notifications /api/notifications/messages
router.get("/messages", getMessageNotifications);

// GET notifications by type /api/notifications/type/:type
router.get("/type/:type", getNotificationsByType);

// CREATE message notification /api/notifications/message
router.post("/message", createMessageNotification);

// PATCH /api/notifications/read-all
router.patch("/read-all", markAllRead);

// PATCH /api/notifications/:id/read 
router.patch("/:id/read", markAsRead);

// DELETE /api/notifications/:id  
router.delete("/:id", deleteNotification);

module.exports = router;