import User from "../models/User.js";
import Address from "../models/Address.js";
import Order from "../models/Order.js";
import asyncHandler from "express-async-handler";
import { uploadFormData } from "../utils/upload.js"; // Import form data upload utility
const baseUrl = process.env.BASE_URL || "http://localhost:5000"; // Add base URL

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      mobile: user.mobile,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      profileImage: user.profileImage
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Basic validations
    if (req.body.name !== undefined && req.body.name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Name cannot be empty",
      });
    }

    if (req.body.mobile && req.body.mobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be 10 digits",
      });
    }

    if (req.body.dateOfBirth && isNaN(Date.parse(req.body.dateOfBirth))) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format for date of birth",
      });
    }

    // Update user fields
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    if (req.body.mobile !== undefined) user.mobile = req.body.mobile;
    if (req.body.dateOfBirth !== undefined) user.dateOfBirth = req.body.dateOfBirth;
    if (req.body.gender !== undefined) user.gender = req.body.gender;

    // Handle profile image upload
    if (req.file) {
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          success: false,
          message: "Only image files are allowed",
        });
      }

      const normalizedPath = req.file.path.replace(/\\/g, "/").replace("uploads/", "");
      user.profileImage = `${baseUrl}/uploads/${normalizedPath}`;
    }

    const updatedUser = await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        mobile: updatedUser.mobile,
        dateOfBirth: updatedUser.dateOfBirth,
        gender: updatedUser.gender,
        profileImage: updatedUser.profileImage,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating profile",
      error: err.message,
    });
  }
});


// @desc    Get user addresses
// @route   GET /api/users/addresses
// @access  Private
export const getUserAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(addresses);
});

// @desc    Add user address
// @route   POST /api/users/addresses
// @access  Private
export const addUserAddress = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const newAddress = new Address({
    ...req.body,
    user: userId,
  });

  // If user has no addresses yet, make this default
  const addressCount = await Address.countDocuments({ user: userId });
  if (addressCount === 0) newAddress.isDefault = true;

  await newAddress.save();
  res.status(201).json({ message: "Address added successfully", address: newAddress });
});

// @desc    Update user address
// @route   PUT /api/users/addresses/:id
// @access  Private
export const updateUserAddress = asyncHandler(async (req, res) => {
  const updated = await Address.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: "Address not found" });
  res.json({ message: "Address updated", address: updated });
});

// @desc    Delete user address
// @route   DELETE /api/users/addresses/:id
// @access  Private
export const deleteUserAddress = asyncHandler(async (req, res) => {
  const deleted = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!deleted) return res.status(404).json({ message: "Address not found" });
  res.json({ message: "Address deleted" });
});

// @desc    Set default address
// @route   PUT /api/users/addresses/:id/default
// @access  Private
export const setDefaultAddress = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await Address.updateMany({ user: userId }, { isDefault: false });
  const defaultAddr = await Address.findOneAndUpdate(
    { _id: req.params.id, user: userId },
    { isDefault: true },
    { new: true }
  );

  res.json({ message: "Default address set", address: defaultAddr });
});

// @desc    Get user order history
// @route   GET /api/users/orders
// @access  Private
export const getOrderHistory = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).populate("items.product");
  res.json(orders);
});

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ role: "user" }).select("-password");
  res.json(users);
});

// @desc    Get user by ID (Admin only)
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Update user (Admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    if (req.body.role) {
      user.role = req.body.role;
    }
    // Update new fields if provided
    if (req.body.mobile !== undefined) user.mobile = req.body.mobile;
    if (req.body.dateOfBirth !== undefined) user.dateOfBirth = req.body.dateOfBirth;
    if (req.body.gender !== undefined) user.gender = req.body.gender;
    if (req.body.profileImage !== undefined) user.profileImage = req.body.profileImage;
    
    const updatedUser = await user.save();
    
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      mobile: updatedUser.mobile,
      dateOfBirth: updatedUser.dateOfBirth,
      gender: updatedUser.gender,
      profileImage: updatedUser.profileImage
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (user) {
    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error("Cannot delete your own account");
    }
    
    await user.deleteOne();
    res.json({ message: "User removed" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});