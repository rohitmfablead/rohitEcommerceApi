import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import { createNotification } from "./notificationController.js";
import { sendEmail, emailTemplates } from "../utils/emailService.js";

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
export const createReview = asyncHandler(async (req, res) => {
  console.log("Creating review with data:", req.body);
  const { productId, rating, comment } = req.body;

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // Check if user has purchased this product
  const order = await Order.findOne({
    user: req.user._id,
    "items.product": productId,
    isPaid: true
  });

  const isVerifiedPurchase = !!order;

  // Check if user already reviewed this product
  const existingReview = await Review.findOne({
    user: req.user._id,
    product: productId
  });

  if (existingReview) {
    res.status(400);
    throw new Error("You have already reviewed this product");
  }

  // Create review
  const review = await Review.create({
    user: req.user._id,
    product: productId,
    rating,
    comment,
    isVerifiedPurchase
  });
  
  console.log("Created review:", review);

  // Update product ratings
  console.log("Calling updateProductRatings for product:", productId);
  await updateProductRatings(productId);
  
  // Notify admins about new review
  const admins = await User.find({ role: "admin" });
  const user = await User.findById(req.user._id);
  
  for (const admin of admins) {
    await createNotification({
      user: admin._id,
      title: "New Review Received",
      message: `A new review has been submitted for ${product.name}`,
      type: "review",
    });
    
    // Send email notification to admin
    try {
      await sendEmail(
        admin.email,
        `New Review: ${product.name}`,
        emailTemplates.newReviewReceived(product, review)
      );
    } catch (emailError) {
      console.error("Failed to send new review email to admin:", emailError);
    }
  }

  res.status(201).json(review);
});

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
export const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ 
    product: req.params.productId,
    isApproved: true
  })
  .populate("user", "name")
  .sort({ createdAt: -1 });

  res.json(reviews);
});

// @desc    Get all reviews (admin)
// @route   GET /api/reviews
// @access  Private/Admin
export const getAllReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({})
    .populate("user", "name email")
    .populate("product", "name")
    .sort({ createdAt: -1 });

  res.json(reviews);
});

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
export const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (review) {
    if (review.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error("Not authorized to update this review");
    }

    review.rating = req.body.rating || review.rating;
    review.comment = req.body.comment || review.comment;

    const updatedReview = await review.save();

    // Update product ratings
    await updateProductRatings(review.product);

    res.json(updatedReview);
  } else {
    res.status(404);
    throw new Error("Review not found");
  }
});

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check if user is owner or admin
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(401).json({ message: "Not authorized" });
    }

    await review.deleteOne(); // Use deleteOne() instead of remove()
    res.json({ message: "Review removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Admin - Approve or reject review
// @route   PUT /api/reviews/:id/status
// @access  Private/Admin
export const updateReviewStatus = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (review) {
    review.isApproved = req.body.isApproved;

    const updatedReview = await review.save();

    // Update product ratings if approved
    if (review.isApproved) {
      await updateProductRatings(review.product);
    }

    res.json(updatedReview);
  } else {
    res.status(404);
    throw new Error("Review not found");
  }
});

// Helper function to update product ratings
export const updateProductRatings = async (productId) => {
  console.log("Updating ratings for product:", productId);
  const reviews = await Review.find({ 
    product: productId, 
    isApproved: true 
  });
  
  console.log(`Found ${reviews.length} approved reviews for product ${productId}`);

  if (reviews.length > 0) {
    const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    console.log(`Calculated average rating: ${averageRating} from ${reviews.length} reviews`);

    const result = await Product.findByIdAndUpdate(productId, {
      $set: {
        avgRating: averageRating,
        ratingCount: reviews.length
      }
    });
    
    console.log("Updated product ratings:", result);
  } else {
    const result = await Product.findByIdAndUpdate(productId, {
      $set: {
        avgRating: 0,
        ratingCount: 0
      }
    });
    
    console.log("Cleared product ratings:", result);
  }
};