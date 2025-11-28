import Notification from "../models/Notification.js";
import asyncHandler from "express-async-handler";

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getUserNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 });

  res.json(notifications);
});

// @desc    Get admin notifications
// @route   GET /api/notifications/admin
// @access  Private/Admin
export const getAdminNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ admin: true })
    .sort({ createdAt: -1 });

  res.json(notifications);
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (notification) {
    // Check if user owns notification or is admin
    if (
      (notification.user && notification.user.toString() !== req.user._id.toString()) &&
      (notification.admin && req.user.role !== "admin")
    ) {
      res.status(401);
      throw new Error("Not authorized to update this notification");
    }

    notification.isRead = true;
    const updatedNotification = await notification.save();

    res.json(updatedNotification);
  } else {
    res.status(404);
    throw new Error("Notification not found");
  }
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" 
    ? { admin: true } 
    : { user: req.user._id };

  await Notification.updateMany(filter, { isRead: true });

  res.json({ message: "All notifications marked as read" });
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (notification) {
    // Check if user owns notification or is admin
    if (
      (notification.user && notification.user.toString() !== req.user._id.toString()) &&
      (notification.admin && req.user.role !== "admin")
    ) {
      res.status(401);
      throw new Error("Not authorized to delete this notification");
    }

    await notification.deleteOne();
    res.json({ message: "Notification removed" });
  } else {
    res.status(404);
    throw new Error("Notification not found");
  }
});

// Helper function to create notification
export const createNotification = async (data) => {
  const notification = new Notification({
    user: data.user,
    admin: data.admin || false,
    title: data.title,
    message: data.message,
    type: data.type,
    relatedId: data.relatedId
  });

  return await notification.save();
};