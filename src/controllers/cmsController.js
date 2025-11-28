import CMS from "../models/CMS.js";
import asyncHandler from "express-async-handler";

// @desc    Create CMS content
// @route   POST /api/cms
// @access  Private/Admin
export const createCMS = asyncHandler(async (req, res) => {
  const { title, slug, content, metaTitle, metaDescription, isActive } = req.body;

  const cmsExists = await CMS.findOne({ slug });

  if (cmsExists) {
    res.status(400);
    throw new Error("CMS page with this slug already exists");
  }

  const cms = new CMS({
    title,
    slug,
    content,
    metaTitle,
    metaDescription,
    isActive
  });

  const createdCMS = await cms.save();
  res.status(201).json(createdCMS);
});

// @desc    Get all CMS content
// @route   GET /api/cms
// @access  Public
export const getCMSList = asyncHandler(async (req, res) => {
  const cmsList = await CMS.find({ isActive: true }, "title slug metaTitle metaDescription");
  res.json(cmsList);
});

// @desc    Get CMS content by slug
// @route   GET /api/cms/:slug
// @access  Public
export const getCMSBySlug = asyncHandler(async (req, res) => {
  const cms = await CMS.findOne({ slug: req.params.slug, isActive: true });

  if (cms) {
    res.json(cms);
  } else {
    res.status(404);
    throw new Error("CMS page not found");
  }
});

// @desc    Update CMS content
// @route   PUT /api/cms/:id
// @access  Private/Admin
export const updateCMS = asyncHandler(async (req, res) => {
  const { title, slug, content, metaTitle, metaDescription, isActive } = req.body;

  const cms = await CMS.findById(req.params.id);

  if (cms) {
    // Check if another CMS page already has this slug
    if (slug && slug !== cms.slug) {
      const slugExists = await CMS.findOne({ slug });
      if (slugExists) {
        res.status(400);
        throw new Error("CMS page with this slug already exists");
      }
    }

    cms.title = title || cms.title;
    cms.slug = slug || cms.slug;
    cms.content = content || cms.content;
    cms.metaTitle = metaTitle || cms.metaTitle;
    cms.metaDescription = metaDescription || cms.metaDescription;
    cms.isActive = isActive !== undefined ? isActive : cms.isActive;

    const updatedCMS = await cms.save();
    res.json(updatedCMS);
  } else {
    res.status(404);
    throw new Error("CMS page not found");
  }
});

// @desc    Delete CMS content
// @route   DELETE /api/cms/:id
// @access  Private/Admin
export const deleteCMS = asyncHandler(async (req, res) => {
  const cms = await CMS.findById(req.params.id);

  if (cms) {
    await cms.deleteOne();
    res.json({ message: "CMS page removed" });
  } else {
    res.status(404);
    throw new Error("CMS page not found");
  }
});

// @desc    Get all CMS content (admin)
// @route   GET /api/cms/admin
// @access  Private/Admin
export const getCMSAdmin = asyncHandler(async (req, res) => {
  const cmsList = await CMS.find({}).sort({ createdAt: -1 });
  res.json(cmsList);
});

// @desc    Get CMS content by ID (admin)
// @route   GET /api/cms/admin/:id
// @access  Private/Admin
export const getCMSById = asyncHandler(async (req, res) => {
  const cms = await CMS.findById(req.params.id);

  if (cms) {
    res.json(cms);
  } else {
    res.status(404);
    throw new Error("CMS page not found");
  }
});