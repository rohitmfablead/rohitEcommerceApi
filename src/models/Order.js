import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
        price: Number // Price at the time of order
      },
    ],
    shippingAddress: {
      address: String,
      city: String,
      postalCode: String,
      country: String
    },
    totalPrice: Number,
    discountedPrice: Number, // Price after applying coupons
    coupon: {
      code: String,
      discount: Number
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "out-for-delivery", "delivered", "cancelled", "returned", "Paid"],
      default: "pending",
    },
    paymentMethod: { type: String, default: "COD" },
    paymentResult: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    paidAt: Date,
    isDelivered: {
      type: Boolean,
      default: false
    },
    deliveredAt: Date
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);