import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
        price: Number, // Price at the time of order
      },
    ],

    shippingAddress: {
      address: String,
      city: String,
      postalCode: String,
      country: String,
    },

    totalPrice: Number,
    discountedPrice: Number, // Price after applying coupons

    coupon: {
      code: String,
      discount: Number,
    },

    // 🔹 Order status (delivery ka flow)
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "out-for-delivery",
        "delivered",
        "cancelled",
        "returned",
      ],
      default: "pending",
    },

    // 🔹 Payment method
    paymentMethod: { type: String, default: "COD" },

    // 🔹 Payment gateway result (Razorpay)
    paymentResult: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
    },

    // 🔹 Simple boolean flag
    isPaid: {
      type: Boolean,
      default: false,
    },

    // 🔹 Detailed payment status
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    paidAt: Date,

    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
