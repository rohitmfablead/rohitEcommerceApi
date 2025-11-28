import crypto from "crypto";
import Order from "../models/Order.js"; // assuming you have an Order model
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: "rzp_test_RYSrB6sPc5KhU2",
  key_secret: "W2UYGJUMppSBRYwyNZRYirHx",
});

// -------------------- Create Order (Generate Razorpay Order) --------------------
export const createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR" } = req.body;

    // Razorpay expects amount in paise
    const options = {
      amount: amount * 100,
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // Generate signature for backend testing
    const body = order.id + "|" + "TEST_PAYMENT_ID"; // use dummy payment_id for testing

    console.log(order);
    const signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");
    console.log("Signature:", signature);
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      test_signature: signature, // <-- signature you can use in Postman
    });
    console.log("Order created successfully");
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// -------------------- Verify Payment (After Payment Success) --------------------
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderData,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");
    console.log("object", expectedSignature, razorpay_signature);
    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    const { amount = 0, items = [], address = {} } = orderData || {};

    const newOrder = await Order.create({
      user: req.user._id,
      paymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      amount,
      items,
      address,
      status: "Paid", 
      paymentMethod: "Razorpay",
    });

    console.log(newOrder);
    res.json({
      success: true,
      message: "Payment verified successfully",
      order: newOrder,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
