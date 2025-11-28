import express from "express";
import { protect, admin } from "../middlewares/authMiddleware.js";
import {
  createReview,
  getProductReviews,
  getAllReviews,
  updateReview,
  deleteReview,
  updateReviewStatus
} from "../controllers/reviewController.js";

const router = express.Router();

// Public routes
router.route("/product/:productId")
  .get(getProductReviews);

// User routes
router.route("/")
  .post(protect, createReview);

router.route("/:id")
  .put(protect, updateReview)
  .delete(protect, deleteReview);

// Admin routes
router.route("/")
  .get(protect, admin, getAllReviews);

router.route("/:id/status")
  .put(protect, admin, updateReviewStatus);

export default router;