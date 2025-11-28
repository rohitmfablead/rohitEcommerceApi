import express from "express";
import { protect, admin } from "../middlewares/authMiddleware.js";
import { 
  getUserProfile, 
  updateUserProfile,
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultAddress,
  getOrderHistory,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} from "../controllers/userController.js";
import { uploadFormData } from "../utils/upload.js"; // Import form data upload middleware

const router = express.Router();

// Profile routes
router.route("/profile")
  .get(protect, getUserProfile)
  .put(protect, uploadFormData, updateUserProfile); // Use form data middleware for profile image

// Address routes
router.route("/addresses")
  .get(protect, getUserAddresses)
  .post(protect, addUserAddress);

router.route("/addresses/:id")
  .put(protect, updateUserAddress)
  .delete(protect, deleteUserAddress);

router.put("/addresses/:id/default", protect, setDefaultAddress);

// Order history route
router.get("/orders", protect, getOrderHistory);

// Admin routes
router.route("/")
  .get(protect, admin, getAllUsers)
  .delete(protect, admin, deleteUser);

router.route("/:id")
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

export default router;