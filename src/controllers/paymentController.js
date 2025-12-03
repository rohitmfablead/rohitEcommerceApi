// controllers/paymentsController.js
import crypto from "crypto";
import Razorpay from "razorpay";
import Order from "../models/Order.js";
import { createNotification } from "./notificationController.js";

// POST /api/payments/create-order
export const createRazorpayOrder = async (req, res) => {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { amount, currency = "INR" } = req.body;

    const options = {
      amount, 
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return res.json({
      success: true,
      data: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    console.error("Razorpay createOrder error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create order",
    });
  }
};

// POST /api/payments/verify-payment
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId, // 🔴 frontend se bhejna hoga
    } = req.body;

    // 1) Razorpay signature verify
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    // 2) Order ko find karo
    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "orderId is required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // 3) Order me payment details update karo
    order.paymentResult = {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    };

    order.paymentStatus = "paid"; 
    order.isPaid = true;
    order.paidAt = Date.now();

    await order.save();

    // 4) User ko notification (optional but nice)
    await createNotification({
      user: order.user,
      title: "Payment Successful",
      message: `Payment for order #${order._id} was successful`,
      type: "order",
    });

    return res.json({
      success: true,
      message: "Payment verified and order marked as paid",
      order,
    });
  } catch (err) {
    console.error("Razorpay verifyPayment error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to verify payment",
    });
  }
};
