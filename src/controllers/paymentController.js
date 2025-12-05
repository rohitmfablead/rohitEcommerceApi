// controllers/paymentsController.js
import crypto from "crypto";
import Razorpay from "razorpay";
import Order from "../models/Order.js";
import { createNotification } from "./notificationController.js";
import { sendEmail, emailTemplates } from "../utils/emailService.js";
import User from "../models/User.js";
import Setting from "../models/Setting.js";

// POST /api/payments/create-order
export const createRazorpayOrder = async (req, res) => {
  try {
    // Get settings from database
    const settings = await Setting.getSettings();
    
    const razorpay = new Razorpay({
      key_id: settings.razorpayKeyId,
      key_secret: settings.razorpayKeySecret,
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
        key: settings.razorpayKeyId,
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

    // Get settings from database
    const settings = await Setting.getSettings();
    
    // 1) Razorpay signature verify
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", settings.razorpayKeySecret)
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

    // Get user email
    const user = await User.findById(order.user);

    // 4) User ko notification (optional but nice)
    await createNotification({
      user: order.user,
      title: "Payment Successful",
      message: `Payment for order #${order._id} was successful`,
      type: "order",
    });

    // Send email notification to user
    try {
      await sendEmail(
        user.email,
        `Payment Confirmation #${order._id}`,
        emailTemplates.paymentConfirmation(order)
      );
    } catch (emailError) {
      console.error("Failed to send payment confirmation email:", emailError);
    }

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