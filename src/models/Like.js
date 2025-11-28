// src/models/Like.js
import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }
  },
  { timestamps: true }
);

// user + product combination unique
likeSchema.index({ user: 1, product: 1 }, { unique: true });

export default mongoose.model("Like", likeSchema);
