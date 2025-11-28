import express from "express";
import { register, login } from "../controllers/authController.js";
import { uploadFormData } from "../utils/upload.js";

const router = express.Router();

router.post("/register", uploadFormData, register);
router.post("/login", login);

export default router;