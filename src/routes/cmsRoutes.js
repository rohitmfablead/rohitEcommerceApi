import express from "express";
import { 
  createCMS,
  getCMSList,
  getCMSBySlug,
  updateCMS,
  deleteCMS,
  getCMSAdmin,
  getCMSById
} from "../controllers/cmsController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public routes
router.route("/")
  .get(getCMSList)
  .post(protect, admin, createCMS);

router.route("/admin")
  .get(protect, admin, getCMSAdmin);

router.route("/:slug")
  .get(getCMSBySlug);

// Admin routes
router.route("/admin/:id")
  .get(protect, admin, getCMSById)
  .put(protect, admin, updateCMS)
  .delete(protect, admin, deleteCMS);

export default router;