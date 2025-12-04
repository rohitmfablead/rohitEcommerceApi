// src/controllers/wishlistController.js
import Like from "../models/Like.js";
import Product from "../models/Product.js";
import asyncHandler from "express-async-handler";
import { createNotification } from "./notificationController.js";
import { sendEmail, emailTemplates } from "../utils/emailService.js";
import User from "../models/User.js";

// @desc    Toggle product in wishlist (add / remove)
// @route   POST /api/wishlist/:productId/toggle
// @access  Private
export const toggleWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user._id;

  // 1) Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // 2) Check if already in wishlist
  const existingLike = await Like.findOne({
    user: userId,
    product: productId
  });

  let isLiked;
  let message;

  if (existingLike) {
    // Already liked -> remove
    await Like.deleteOne({ _id: existingLike._id });
    isLiked = false;
    message = "Product removed from wishlist";
  } else {
    // Not liked -> add
    await Like.create({
      user: userId,
      product: productId
    });
    isLiked = true;
    message = "Product added to wishlist";
  }

  const wishlistCount = await Like.countDocuments({ product: productId });

  // If product was added to wishlist, send notification
  if (isLiked) {
    // Get user details
    const user = await User.findById(userId);
    
    // Create notification
    await createNotification({
      user: userId,
      title: "Product Added to Wishlist",
      message: `You've added ${product.name} to your wishlist`,
      type: "wishlist",
      sendEmail: true
    });
    
    // Send email notification
    try {
      await sendEmail(
        user.email,
        `Added to Wishlist: ${product.name}`,
        emailTemplates.productAddedToWishlist(user, product)
      );
    } catch (emailError) {
      console.error("Failed to send wishlist addition email:", emailError);
    }
  }

  res.json({
    message,
    isLiked,
    wishlistCount
  });
});

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = asyncHandler(async (req, res) => {
  const likes = await Like.find({ user: req.user._id })
    .populate({
      path: "product",
      populate: {
        path: "category",
        select: "name",
      },
    });

  res.status(200).json({
    success: true,
    message: "Wishlist fetched successfully",
    data: likes, // <-- Always send array in data
  });
});