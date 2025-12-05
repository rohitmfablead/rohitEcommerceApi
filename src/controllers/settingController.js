import Setting from "../models/Setting.js";
import asyncHandler from "express-async-handler";

// @desc    Get store settings
// @route   GET /api/settings
// @access  Public
export const getSettings = asyncHandler(async (req, res) => {
  try {
    const settings = await Setting.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ 
      message: "Failed to fetch settings",
      error: error.message 
    });
  }
});

// @desc    Update store settings
// @route   PUT /api/settings
// @access  Private/Admin
export const updateSettings = asyncHandler(async (req, res) => {
  try {
    let settings = await Setting.getSettings();
    
    // Update only provided fields
    if (req.body.razorpayKeyId !== undefined) {
      settings.razorpayKeyId = req.body.razorpayKeyId;
    }
    
    if (req.body.razorpayKeySecret !== undefined) {
      settings.razorpayKeySecret = req.body.razorpayKeySecret;
    }
    
    if (req.body.codEnabled !== undefined) {
      settings.codEnabled = req.body.codEnabled;
    }
    
    if (req.body.flatShippingRate !== undefined) {
      settings.flatShippingRate = req.body.flatShippingRate;
    }
    
    if (req.body.freeShippingThreshold !== undefined) {
      settings.freeShippingThreshold = req.body.freeShippingThreshold;
    }
    
    const updatedSettings = await settings.save();
    res.json(updatedSettings);
  } catch (error) {
    res.status(500).json({ 
      message: "Failed to update settings",
      error: error.message 
    });
  }
});