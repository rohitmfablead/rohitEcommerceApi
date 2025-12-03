// src/models/Product.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  images: [String],

  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  
  tags: [{
    type: String
  }],

  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  ratings: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      rating: { type: Number, min: 1, max: 5 }
    }
  ],

  status: {
    type: String,
    enum: ["available", "out-of-stock", "discontinued"],
    default: "available",
  },

  discount: {
    type: Number,
    default: 0,
  },

  finalPrice: {
    type: Number,
  }
}, { timestamps: true });

// Auto-calc finalPrice
productSchema.pre("save", function (next) {
  if (typeof this.discount === "number" && this.discount > 0) {
    this.finalPrice = this.price - (this.price * this.discount) / 100;
  } else {
    this.finalPrice = this.price;
  }
  next();
});

export default mongoose.model("Product", productSchema);
