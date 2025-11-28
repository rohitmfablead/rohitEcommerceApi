// src/routes/productRoutes.js
import express from "express";
import { protect, admin } from "../middlewares/authMiddleware.js";
import { optionalAuth } from "../middlewares/optionalAuthMiddleware.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductStock,
  toggleLike,
  rateProduct,
  getProductsByTag,
  getHomepageProducts,
  addTagToProduct,
  removeTagFromProduct,
} from "../controllers/productController.js";

const router = express.Router();

// Public + user-specific info (isLiked, inCart) via optionalAuth
router.get("/", optionalAuth, getProducts);
router.get("/home", optionalAuth, getHomepageProducts);
router.get("/tag/:tag", optionalAuth, getProductsByTag);
router.get("/:id", optionalAuth, getProductById);

// Admin CRUD
router.post("/", protect, admin, createProduct);
router.put("/:id", protect, admin, updateProduct);
router.delete("/:id", protect, admin, deleteProduct);
router.patch("/:id/stock", protect, admin, updateProductStock);

// Likes / Ratings (need login)
router.post("/:id/like", protect, toggleLike);
router.post("/:id/rate", protect, rateProduct);

// Tags
router.post("/:id/tag", protect, admin, addTagToProduct);
router.delete("/:id/tag", protect, admin, removeTagFromProduct);

export default router;
