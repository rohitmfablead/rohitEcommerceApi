import express from "express";
import { 
  createBanner,
  getBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
  getBannersAdmin
} from "../controllers/bannerController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

import { uploadSingle } from "../utils/upload.js";
// Public routes
router.post("/", protect, admin, uploadSingle, createBanner);


router.route("/admin")
  .get(protect, admin, getBannersAdmin);

// Admin routes
router.route("/:id")
  .get(getBannerById)
  .put(protect, admin, uploadSingle, updateBanner)
  .delete(protect, admin, deleteBanner);

export default router;