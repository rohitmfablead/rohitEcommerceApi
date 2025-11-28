import Banner from "../models/Banner.js";
import asyncHandler from "express-async-handler";
const baseUrl = process.env.BASE_URL || "http://localhost:5000"; 
// @desc    Create a new banner/slider
// @route   POST /api/banners
// @access  Private/Admin
export const createBanner = asyncHandler(async (req, res) => {
  const { title, description, link, position, isActive, type } = req.body;

  // File → imageUrl
  let imageUrl = null;
  if (req.file) {
    const path = req.file.path.replace(/\\/g, "/");
    imageUrl = `${baseUrl}/${path}`;
  }

  const banner = await Banner.create({
    title,
    description,
    imageUrl,
    link,
    position,
    isActive,
    type,
  });

  res.status(201).json(banner);
});
// @desc    Get all banners/sliders
// @route   GET /api/banners
// @access  Public
export const getBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find({ isActive: true }).sort({ position: 1 });
  res.json(banners);
});

// @desc    Get banner by ID
// @route   GET /api/banners/:id
// @access  Public
export const getBannerById = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);

  if (banner) {
    res.json(banner);
  } else {
    res.status(404);
    throw new Error("Banner not found");
  }
});

// @desc    Update banner
// @route   PUT /api/banners/:id
// @access  Private/Admin
export const updateBanner = asyncHandler(async (req, res) => {
  const { title, description, link, position, isActive, type } = req.body;

  const banner = await Banner.findById(req.params.id);
  if (!banner) {
    res.status(404);
    throw new Error("Banner not found");
  }

  banner.title = title || banner.title;
  banner.description = description || banner.description;
  banner.link = link || banner.link;
  banner.position = position ?? banner.position;
  banner.isActive = isActive ?? banner.isActive;
  banner.type = type || banner.type;

  // Update file
  if (req.file) {
    const path = req.file.path.replace(/\\/g, "/");
    banner.imageUrl = `${baseUrl}/${path}`;
  }

  const updated = await banner.save();
  res.json(updated);
});

// @desc    Delete banner
// @route   DELETE /api/banners/:id
// @access  Private/Admin
export const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);

  if (banner) {
    await banner.deleteOne();
    res.json({ message: "Banner removed" });
  } else {
    res.status(404);
    throw new Error("Banner not found");
  }
});

// @desc    Get all banners/sliders (admin)
// @route   GET /api/banners/admin
// @access  Private/Admin
export const getBannersAdmin = asyncHandler(async (req, res) => {
  const banners = await Banner.find({}).sort({ position: 1, createdAt: -1 });
  res.json(banners);
});
