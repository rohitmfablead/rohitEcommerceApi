import express from "express";
import { protect, admin } from "../middlewares/authMiddleware.js";
import {
  getUserNotifications,
  getAdminNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from "../controllers/notificationController.js";

const router = express.Router();

// User routes
router.route("/")
  .get(protect, getUserNotifications);

router.route("/read-all")
  .put(protect, markAllAsRead);

router.route("/:id/read")
  .put(protect, markAsRead);

router.route("/:id")
  .delete(protect, deleteNotification);

// Admin routes
router.route("/admin")
  .get(protect, admin, getAdminNotifications);

export default router;