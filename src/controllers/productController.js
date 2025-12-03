// src/controllers/productController.js
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";
import Like from "../models/Like.js";
import Review from "../models/Review.js";
import Tag from "../models/Tag.js";

const baseUrl = process.env.BASE_URL || "http://localhost:5000";

// -------------------- Helper: Get Liked Products --------------------
const getLikedProductIds = async (userId) => {
  if (!userId) return [];
  const likes = await Like.find({ user: userId }).select("product");
  return likes.map((l) => l.product.toString());
};

// -------------------- Helper: Update Product Ratings from Reviews --------------------
const updateProductRatings = async (productId) => {
  const reviews = await Review.find({
    product: productId,
    isApproved: true,
  });

  if (reviews.length > 0) {
    const totalRating = reviews.reduce(
      (acc, review) => acc + (Number(review.rating) || 0),
      0
    );
    const averageRating = totalRating / reviews.length;

    await Product.findByIdAndUpdate(productId, {
      $set: {
        avgRating: averageRating,
        ratingCount: reviews.length,
      },
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      $set: {
        avgRating: 0,
        ratingCount: 0,
      },
    });
  }
};

// -------------------- Create Product --------------------
export const createProduct = async (req, res) => {
  try {
    // Log the request body for debugging
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);
    
    // Check if req.body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: "Request body is required. Please send product data in form-data format.",
        receivedBody: req.body,
        receivedFiles: req.files
      });
    }

    const {
      name,
      description,
      price,
      stock,
      category,
      discount,
      status,
      tags,
    } = req.body;

    if (!name || !description || !price || !stock || !category) {
      return res.status(400).json({
        message:
          "All fields (name, description, price, stock, category) are required",
        missingFields: {
          name: !name,
          description: !description,
          price: !price,
          stock: !stock,
          category: !category
        }
      });
    }

    // Validate price and stock are numbers
    const priceNum = Number(price);
    const stockNum = Number(stock);
    
    if (isNaN(priceNum) || isNaN(stockNum)) {
      return res.status(400).json({
        message: "Price and stock must be valid numbers",
        price: typeof price,
        stock: typeof stock
      });
    }

    const trimmedStatus = status ? status.trim() : undefined;

    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => {
        const normalizedPath = file.path
          .replace(/\\/g, "/")
          .replace("uploads/", "");
        return `${baseUrl}/uploads/${normalizedPath}`;
      });
    }

    let product = await Product.create({
      name,
      description,
      price: priceNum,
      stock: stockNum,
      category,
      images,
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
      discount: Number(discount) || 0,
      status: trimmedStatus,
    });

    product = await Product.findById(product._id).populate("category");

    const avgRating = product.avgRating || 0;
    const numReviews = product.ratingCount || 0;

    res.status(201).json({
      ...product.toObject(),
      isLiked: false,
      avgRating,
      numReviews,
      inCart: false,
      cartItem: null,
    });
  } catch (err) {
    console.error("Error creating product:", err);
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File size too large. Maximum file size is 5MB.",
      });
    }

    if (err.message === "Only image files are allowed!") {
      return res.status(400).json({
        message: "Invalid file type. Only image files are allowed.",
      });
    }

    res.status(400).json({ 
      message: err.message,
      error: err.toString()
    });
  }
};

// -------------------- Get All Products --------------------
export const getProducts = async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      minRating,
      search,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    let filter = {};

    if (category) filter.category = category;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    let sortObj = {};
    switch (sort) {
      case "price-low-high":
        sortObj.price = 1;
        break;
      case "price-high-low":
        sortObj.price = -1;
        break;
      case "name-a-z":
        sortObj.name = 1;
        break;
      case "name-z-a":
        sortObj.name = -1;
        break;
      case "rating-high-low":
        sortObj.avgRating = -1;
        break;
      default:
        sortObj.createdAt = -1;
    }

    const userId = req.user ? req.user._id.toString() : null;

    const totalProducts = await Product.countDocuments(filter);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let products = await Product.find(filter)
      .populate("category")
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    let likedProductIds = [];
    let cartProductIds = [];
    let cartItems = {};

    if (userId) {
      likedProductIds = await getLikedProductIds(userId);
      const cart = await Cart.findOne({ user: userId });
      if (cart) {
        cartProductIds = cart.items.map((item) => item.product.toString());
        cart.items.forEach((item) => {
          cartItems[item.product.toString()] = item;
        });
      }
    }

    const result = products.map((p) => {
      const isLiked = userId
        ? likedProductIds.includes(p._id.toString())
        : false;
      const inCart = userId ? cartProductIds.includes(p._id.toString()) : false;
      const cartItem = inCart
        ? {
            cartItemId: cartItems[p._id.toString()]._id,
            quantity: cartItems[p._id.toString()].quantity,
          }
        : null;

      const avgRating = p.avgRating || 0;
      const numReviews = p.ratingCount || 0;

      return {
        ...p.toObject(),
        isLiked,
        avgRating,
        numReviews,
        inCart,
        cartItem,
      };
    });

    let filteredResult = result;
    if (minRating) {
      filteredResult = result.filter(
        (p) => (p.avgRating || 0) >= Number(minRating)
      );
    }

    res.json({
      products: filteredResult,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalProducts / limitNum),
        totalProducts,
        hasNext: pageNum < Math.ceil(totalProducts / limitNum),
        hasPrev: pageNum > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- Get Single Product --------------------
export const getProductById = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id).populate("category");

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    const userId = req.user ? req.user._id.toString() : null;

    let isLiked = false;
    let inCart = false;
    let cartItem = null;

    if (userId) {
      const likedProductIds = await getLikedProductIds(userId);
      isLiked = likedProductIds.includes(product._id.toString());

      const cart = await Cart.findOne({ user: userId });
      if (cart) {
        const cartItemObj = cart.items.find(
          (item) => item.product.toString() === product._id.toString()
        );
        if (cartItemObj) {
          inCart = true;
          cartItem = {
            cartItemId: cartItemObj._id,
            quantity: cartItemObj.quantity,
          };
        }
      }
    }

    // ⭐ Fetch reviews for this product
    const reviews = await Review.find({
      product: product._id,
      isApproved: true,
    })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    // Default from persisted fields
    let avgRating = product.avgRating || 0;
    let numReviews = product.ratingCount || 0;

    // If not set properly but reviews exist, compute from reviews
    if ((!avgRating || !numReviews) && reviews.length > 0) {
      numReviews = reviews.length;
      const total = reviews.reduce(
        (sum, r) => sum + (Number(r.rating) || 0),
        0
      );
      avgRating = total / numReviews;
    }

    const similarProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
    })
      .populate("category")
      .limit(4);

    const processedSimilarProducts = similarProducts.map((p) => {
      const similarAvgRating = p.avgRating || 0;
      const similarNumReviews = p.ratingCount || 0;
      return {
        _id: p._id,
        name: p.name,
        price: p.price,
        images: p.images,
        avgRating: similarAvgRating,
        numReviews: similarNumReviews,
      };
    });

    res.json({
      ...product.toObject(),
      isLiked,
      inCart,
      cartItem,
      avgRating,
      numReviews,
      reviews, // ⭐ full reviews array
      similarProducts: processedSimilarProducts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- Update Product --------------------
export const updateProduct = async (req, res) => {
  try {
    console.log("Update request body:", req.body);
    console.log("Update request files:", req.files);

    if (!req.body) {
      return res.status(400).json({
        message: "Request body is required",
      });
    }

    const {
      name,
      description,
      price,
      stock,
      category,
      discount,
      status,
      tags,
      images,          // string or array of existing images
      removeImages     // NEW → images to remove
    } = req.body;

    let product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // -----------------------------
    // UPDATE TEXT FIELDS
    // -----------------------------
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (category) product.category = category;
    if (discount !== undefined) product.discount = Number(discount);
    if (status) product.status = status.trim();

    // -----------------------------
    // UPDATE TAGS
    // -----------------------------
    if (tags) {
      product.tags = Array.isArray(tags) ? tags : [tags];
    }

    // -----------------------------
    // IMAGE HANDLING
    // -----------------------------

    // 1. Existing images from req.body.images
    let finalImages = [];

    if (images) {
      finalImages = Array.isArray(images) ? images : [images];
    } else {
      finalImages = product.images; // keep old if nothing sent
    }

    // 2. Remove images if requested
    if (removeImages) {
      const removeList = Array.isArray(removeImages)
        ? removeImages
        : [removeImages];

      finalImages = finalImages.filter((img) => !removeList.includes(img));
    }

    // 3. Add new uploaded images
    if (req.files && req.files.length > 0) {
      const uploadedImages = req.files.map((file) => {
        const normalizedPath = file.path
          .replace(/\\/g, "/")
          .replace("uploads/", "");
        return `${baseUrl}/uploads/${normalizedPath}`;
      });

      finalImages.push(...uploadedImages);
    }

    // Set final images
    product.images = finalImages;

    // -----------------------------
    // Save and return
    // -----------------------------
    let updatedProduct = await product.save();
    updatedProduct = await Product.findById(updatedProduct._id).populate("category");

    res.json(updatedProduct);

  } catch (err) {
    console.error("Error updating product:", err);
    res.status(400).json({
      message: err.message,
      error: err.toString(),
    });
  }
};

// -------------------- Delete Product --------------------
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    await product.deleteOne();
    res.json({ message: "Product removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- Update Product Stock --------------------
export const updateProductStock = async (req, res) => {
  try {
    const { stock } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    product.stock = stock;
    const updatedProduct = await product.save();

    res.json({
      message: "Stock updated successfully",
      product: updatedProduct,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// -------------------- Like / Unlike Product --------------------
export const toggleLike = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const productId = req.params.id;

    const existingLike = await Like.findOne({
      user: userId,
      product: productId,
    });
    let isLiked = false;

    if (existingLike) {
      await Like.deleteOne({ _id: existingLike._id });
      isLiked = false;
    } else {
      await Like.create({ user: userId, product: productId });
      isLiked = true;
    }

    res.json({ isLiked });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- Rate Product (rating only) --------------------
export const rateProduct = async (req, res) => {
  try {
    const { rating } = req.body;

    const existingReview = await Review.findOne({
      user: req.user._id,
      product: req.params.id,
    });

    if (existingReview) {
      existingReview.rating = rating;
      await existingReview.save();
    } else {
      await Review.create({
        user: req.user._id,
        product: req.params.id,
        rating,
        comment: "",
        isVerifiedPurchase: false,
        isApproved: true,
      });
    }

    // Update product ratings based on all approved reviews
    await updateProductRatings(req.params.id);

    const updatedProduct = await Product.findById(req.params.id);
    const avgRating = updatedProduct.avgRating || 0;
    const numReviews = updatedProduct.ratingCount || 0;

    res.json({ avgRating, numReviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- Get Products by Tag --------------------
export const getProductsByTag = async (req, res) => {
  try {
    const { tag } = req.params;
    
    // Check if tag parameter exists
    if (!tag) {
      return res.status(400).json({ message: "Tag parameter is required" });
    }

    const { page = 1, limit = 12 } = req.query;

    // Get all distinct tags from products
    const allTags = await Product.distinct("tags");

    if (!allTags.includes(tag)) {
      return res.status(400).json({ message: "Invalid tag" });
    }

    const filter = { tags: tag };
    const userId = req.user ? req.user._id.toString() : null;

    const totalProducts = await Product.countDocuments(filter);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let products = await Product.find(filter)
      .populate("category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    let likedProductIds = [];
    let cartProductIds = [];
    let cartItems = {};

    if (userId) {
      likedProductIds = await getLikedProductIds(userId);
      const cart = await Cart.findOne({ user: userId });
      if (cart) {
        cartProductIds = cart.items.map((item) => item.product.toString());
        cart.items.forEach((item) => {
          cartItems[item.product.toString()] = item;
        });
      }
    }

    const result = products.map((p) => {
      const isLiked = userId
        ? likedProductIds.includes(p._id.toString())
        : false;
      const inCart = userId ? cartProductIds.includes(p._id.toString()) : false;
      const cartItem = inCart
        ? {
            cartItemId: cartItems[p._id.toString()]._id,
            quantity: cartItems[p._id.toString()].quantity,
          }
        : null;

      const avgRating = p.avgRating || 0;
      const numReviews = p.ratingCount || 0;

      return {
        ...p.toObject(),
        isLiked,
        avgRating,
        numReviews,
        inCart,
        cartItem,
      };
    });

    res.json({
      products: result,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalProducts / limitNum),
        totalProducts,
        hasNext: pageNum < Math.ceil(totalProducts / limitNum),
        hasPrev: pageNum > 1,
      },
    });
  } catch (err) {
    console.error("Error fetching products by tag:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------- Get Homepage Products (by tag groups) --------------------
export const getHomepageProducts = async (req, res) => {
  try {
    const userId = req.user ? req.user._id.toString() : null;

    // Get all distinct tags from products
    const allTags = await Product.distinct("tags");
    
    // Define homepage tags - these are the tags we want to display on homepage
    const homepageTags = ["trending", "top-deals", "featured", "sale", "dealoftheday", "bestsellers"];
    
    // Filter to only include tags that actually exist in our products
    const validHomepageTags = homepageTags.filter((tag) =>
      allTags.includes(tag)
    );

    let likedProductIds = [];
    let cartProductIds = [];
    let cartItems = {};

    if (userId) {
      likedProductIds = await getLikedProductIds(userId);
      const cart = await Cart.findOne({ user: userId });
      if (cart) {
        cartProductIds = cart.items.map((item) => item.product.toString());
        cart.items.forEach((item) => {
          cartItems[item.product.toString()] = item;
        });
      }
    }

    const tagProducts = {};

    // For each valid tag, get products with that tag
    for (const tag of validHomepageTags) {
      const products = await Product.find({ tags: tag })
        .populate("category")
        .sort({ createdAt: -1 })
        .limit(8);

      tagProducts[tag] = products.map((p) => {
        const isLiked = userId
          ? likedProductIds.includes(p._id.toString())
          : false;
        const inCart = userId
          ? cartProductIds.includes(p._id.toString())
          : false;
        const cartItem = inCart
          ? {
              cartItemId: cartItems[p._id.toString()]._id,
              quantity: cartItems[p._id.toString()].quantity,
            }
          : null;

        const avgRating = p.avgRating || 0;
        const numReviews = p.ratingCount || 0;

        return {
          ...p.toObject(),
          isLiked,
          avgRating,
          numReviews,
          inCart,
          cartItem,
        };
      });
    }

    res.json(tagProducts);
  } catch (err) {
    console.error("Error fetching homepage products:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------- Add Tag to Product --------------------
export const addTagToProduct = async (req, res) => {
  try {
    // Check if req.body exists
    if (!req.body) {
      return res.status(400).json({
        message: "Tag is required",
      });
    }

    const { tag } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if tag exists in our Tag collection
    const existingTag = await Tag.findOne({ 
      $or: [
        { name: { $regex: new RegExp(`^${tag}$`, 'i') } },
        { slug: tag }
      ]
    });

    // For now, we'll allow adding tags even if they don't exist in the Tag collection
    // In production, you might want to enforce this validation
    const tagName = existingTag ? existingTag.name : tag;

    // Add tag to product if not already present
    if (!product.tags.includes(tagName)) {
      product.tags.push(tagName);
      await product.save();
    }

    res.json({ message: "Tag added successfully", product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- Remove Tag from Product --------------------
export const removeTagFromProduct = async (req, res) => {
  try {
    // Check if req.body exists
    if (!req.body) {
      return res.status(400).json({
        message: "Tag is required",
      });
    }

    const { tag } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if tag exists in our Tag collection
    const existingTag = await Tag.findOne({ 
      $or: [
        { name: { $regex: new RegExp(`^${tag}$`, 'i') } },
        { slug: tag }
      ]
    });

    // For now, we'll allow removing tags even if they don't exist in the Tag collection
    // In production, you might want to enforce this validation
    const tagName = existingTag ? existingTag.name : tag;

    product.tags = product.tags.filter((t) => t !== tagName);
    await product.save();

    res.json({ message: "Tag removed successfully", product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
