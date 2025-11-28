import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  imageUrl: {
    type: String,
    required: true
  },
  link: {
    type: String
  },
  position: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  type: {
    type: String,
    enum: ["banner", "slider"],
    default: "banner"
  }
}, { timestamps: true });

export default mongoose.model("Banner", bannerSchema);