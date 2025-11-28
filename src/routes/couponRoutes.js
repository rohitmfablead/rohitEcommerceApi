import express from "express";
import { protect, admin } from "../middlewares/authMiddleware.js";
import {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  applyCoupon
} from "../controllers/couponController.js";

const router = express.Router();

// Admin routes
router.route("/")
  .post(protect, admin, createCoupon)
  .get(protect, admin, getCoupons);

router.route("/:id")
  .get(protect, admin, getCouponById)
  .put(protect, admin, updateCoupon)
  .delete(protect, admin, deleteCoupon);

// User route to apply coupon
router.route("/apply")
  .post(protect, applyCoupon);

export default router;