import express from "express";
import { getHomepageData } from "../controllers/newHomepageController.js";
import { optionalAuth } from "../middlewares/optionalAuthMiddleware.js";

const router = express.Router();

router.get("/", optionalAuth, getHomepageData);

export default router;