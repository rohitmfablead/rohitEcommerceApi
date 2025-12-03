import express from "express";
import { autocompleteSearch } from "../controllers/productController.js";
import { optionalAuth } from "../middlewares/optionalAuthMiddleware.js";

const router = express.Router();

// Public search endpoints
router.get("/autocomplete", autocompleteSearch);

export default router;