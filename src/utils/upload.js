import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Create uploads directory if it doesn't exist
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/"); // folder to store images
  },
  filename(req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Initialize multer with configuration
const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware for single file upload
export const uploadSingle = upload.single('image');

// Middleware for multiple files upload (up to 5 images)
export const uploadMultiple = upload.array('images', 5);

// Middleware for multiple fields
export const uploadFields = upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'thumbnail', maxCount: 1 }
]);

// Middleware for form data with single file upload
export const uploadFormData = upload.single('profileImage');

export default upload;