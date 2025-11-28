import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { 
  singleUpload, 
  multipleUpload, 
  fieldsUpload, 
  formDataUpload 
} from "../controllers/uploadController.js";

const router = express.Router();

// Single file upload
router.post("/single", protect, singleUpload);

// Multiple files upload
router.post("/multiple", protect, multipleUpload);

// Multiple fields upload
router.post("/fields", protect, fieldsUpload);

// Form data with multiple files upload
router.post("/form-data", protect, formDataUpload);

export default router;