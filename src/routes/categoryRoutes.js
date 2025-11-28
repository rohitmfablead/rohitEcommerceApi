import express from "express";
import { 
  createCategory, 
  getCategories, 
  getCategoryById, // Import the new controller function
  getProductsByCategory,
  updateCategory,
  deleteCategory
} from "../controllers/categoryController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";
import { uploadSingle } from "../utils/upload.js"; // Import upload middleware

const router = express.Router();

// Public routes
router.get("/", getCategories);
router.get("/:id", getCategoryById); // Add route for getting single category
router.get("/:id/products", getProductsByCategory);

// Admin routes
router.post("/", protect, admin, uploadSingle, createCategory); // Add upload middleware
router.put("/:id", protect, admin, uploadSingle, updateCategory); // Add upload middleware
router.delete("/:id", protect, admin, deleteCategory);

export default router;