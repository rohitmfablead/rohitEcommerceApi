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
      fullName: String,
      phoneNumber: String,
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },

    // Detailed pricing breakdown
    subtotal: { 
      type: Number, 
      required: true 
    },
    discount: { 
      type: Number, 
      default: 0 
    }, // Generic discount field for backward compatibility
    
    couponDiscount: { 
      type: Number, 
      default: 0 
    },
    deliveryCharges: { 
      type: Number, 
      default: 0 
    },
    totalPrice: { 
      type: Number, 
      required: true 
    }, // Final amount to be paid
    
    // For backward compatibility
    discountedPrice: { 
      type: Number, 
      default: 0 
    },

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