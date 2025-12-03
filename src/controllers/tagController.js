import Tag from "../models/Tag.js";
import Product from "../models/Product.js";

// -------------------- Create Tag --------------------
export const createTag = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if tag already exists
    const existingTag = await Tag.findOne({ 
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, 'i') } }, // Case insensitive match
      ]
    });

    if (existingTag) {
      return res.status(400).json({ 
        success: false,
        message: "Tag already exists" 
      });
    }

    // Create new tag
    const tag = await Tag.create({ 
      name, 
      description 
    });

    return res.status(201).json({
      success: true,
      message: "Tag created successfully",
      data: tag,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

// -------------------- Get All Tags --------------------
export const getTags = async (req, res) => {
  try {
    const tags = await Tag.find({ isActive: true }).sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      message: "Tags fetched successfully",
      data: tags,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

// -------------------- Get Single Tag --------------------
export const getTagById = async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found",
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Tag fetched successfully",
      data: tag,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

// -------------------- Update Tag --------------------
export const updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    // Check if tag exists
    const tag = await Tag.findById(id);
    if (!tag) {
      return res.status(404).json({ 
        success: false,
        message: "Tag not found" 
      });
    }

    // Check if name is being changed and if it already exists
    if (name && name.toLowerCase() !== tag.name.toLowerCase()) {
      const existingTag = await Tag.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') } // Case insensitive match
      });
      
      if (existingTag) {
        return res.status(400).json({ 
          success: false,
          message: "Tag with this name already exists" 
        });
      }
      tag.name = name;
    }

    // Update fields if provided
    if (description !== undefined) tag.description = description;
    if (isActive !== undefined) tag.isActive = isActive;

    const updatedTag = await tag.save();

    return res.status(200).json({
      success: true,
      message: "Tag updated successfully",
      data: updatedTag,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

// -------------------- Delete Tag --------------------
export const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tag exists
    const tag = await Tag.findById(id);
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found",
      });
    }

    // Check if tag is being used by any products
    const productCount = await Product.countDocuments({ 
      tags: { $in: [tag.name] } 
    });
    
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete tag. It is being used by ${productCount} product(s).`,
      });
    }

    await tag.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Tag deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

// -------------------- Get Products by Tag --------------------
export const getProductsByTag = async (req, res) => {
  try {
    const { tagName } = req.params;
    
    // Find tag by name or slug
    const tag = await Tag.findOne({ 
      $or: [
        { name: { $regex: new RegExp(`^${tagName}$`, 'i') } },
        { slug: tagName }
      ],
      isActive: true 
    });
    
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found",
      });
    }

    // Find products with this tag
    const products = await Product.find({ 
      tags: { $in: [tag.name] } 
    });

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: {
        tag,
        products,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};