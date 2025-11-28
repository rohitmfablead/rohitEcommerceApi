import { uploadSingle, uploadMultiple, uploadFields } from "../utils/upload.js";

// Controller for single file upload
export const singleUpload = (req, res) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    res.status(200).json({
      message: "File uploaded successfully",
      file: {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  });
};

// Controller for multiple file upload
export const multipleUpload = (req, res) => {
  uploadMultiple(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    
    const files = req.files.map(file => ({
      originalname: file.originalname,
      filename: file.filename,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype
    }));
    
    res.status(200).json({
      message: `${req.files.length} files uploaded successfully`,
      files
    });
  });
};

// Controller for multiple fields upload
export const fieldsUpload = (req, res) => {
  uploadFields(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    const response = {};
    
    if (req.files.images) {
      response.images = req.files.images.map(file => ({
        originalname: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      }));
    }
    
    if (req.files.thumbnail) {
      response.thumbnail = {
        originalname: req.files.thumbnail[0].originalname,
        filename: req.files.thumbnail[0].filename,
        path: req.files.thumbnail[0].path,
        size: req.files.thumbnail[0].size,
        mimetype: req.files.thumbnail[0].mimetype
      };
    }
    
    if (!req.files.images && !req.files.thumbnail) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    
    res.status(200).json({
      message: "Files uploaded successfully",
      ...response
    });
  });
};

// Controller for upload with form data
export const formDataUpload = (req, res) => {
  uploadMultiple(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    // Process both files and text fields
    const responseData = {
      message: "Form data and files processed successfully",
      fields: req.body,
      files: []
    };
    
    if (req.files && req.files.length > 0) {
      responseData.files = req.files.map(file => ({
        originalname: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      }));
    }
    
    res.status(200).json(responseData);
  });
};