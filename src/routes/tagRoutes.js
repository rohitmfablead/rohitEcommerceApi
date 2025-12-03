import express from "express";
import { 
  createTag, 
  getTags, 
  getTagById,
  updateTag,
  deleteTag,
  getProductsByTag
} from "../controllers/tagController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getTags);
router.get("/:id", getTagById);
router.get("/:tagName/products", getProductsByTag);

// Admin routes
router.post("/", protect, admin, createTag);
router.put("/:id", protect, admin, updateTag);
router.delete("/:id", protect, admin, deleteTag);

export default router;