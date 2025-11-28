// routes/wishlistRoutes.js
import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  toggleWishlist,
  getWishlist,
} from "../controllers/wishlistController.js";

const router = express.Router();

// Get wishlist
router.route("/").get(protect, getWishlist);

// Toggle wishlist (add/remove same route)
router.route("/:productId/toggle").post(protect, toggleWishlist);

export default router;
