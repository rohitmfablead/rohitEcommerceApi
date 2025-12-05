import mongoose from "mongoose";

const settingSchema = new mongoose.Schema({
  // Razorpay settings
  razorpayKeyId: {
    type: String,
    default: ""
  },
  razorpayKeySecret: {
    type: String,
    default: ""
  },
  
  // Payment settings
  codEnabled: {
    type: Boolean,
    default: true
  },
  
  // Shipping settings
  flatShippingRate: {
    type: Number,
    default: 50
  },
  freeShippingThreshold: {
    type: Number,
    default: 999
  }
}, { timestamps: true });

// Ensure only one settings document exists
settingSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = new this();
    await settings.save();
  }
  return settings;
};

export default mongoose.model("Setting", settingSchema);