// controllers/paymentsController.js
import crypto from "crypto";
import Razorpay from "razorpay";

// POST /api/payments/create-order
export const createOrder = async (req, res) => {
  try {
    // Initialize Razorpay inside the function to ensure env vars are loaded
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { amount, currency = "INR" } = req.body;
    // 👉 amount frontend se PAISA me aayega (e.g. ₹1000 => 100000)

    const options = {
      amount, // dobara *100 mat karo
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
    return res
      .status(500)
      .json({ success: false, message: err.message || "Failed to create order" });
  }
};

// POST /api/payments/verify-payment
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

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

    return res.json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (err) {
    console.error("Razorpay verifyPayment error:", err);
    return res
      .status(500)
      .json({ success: false, message: err.message || "Failed to verify payment" });
  }
};