import express from "express";
import { protect, admin } from "../middlewares/authMiddleware.js";
import { 
  getSettings, 
  updateSettings
} from "../controllers/settingController.js";

const router = express.Router();

// Public route to get settings
router.route("/")
  .get(getSettings);

// Admin route to update settings
router.route("/")
  .put(protect, admin, updateSettings);

export default router;