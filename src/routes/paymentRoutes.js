import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createRazorpayOrder, verifyPayment } from "../controllers/paymentController.js";


const router = express.Router();
router.post("/create-razorpay-order", protect, createRazorpayOrder);
router.post("/verify-payment", protect, verifyPayment);


export default router;
