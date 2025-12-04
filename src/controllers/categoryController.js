import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";
import Like from "../models/Like.js";
// import { uploadSingle } from "../utils/upload.js"; // Agar use nahi kar rahe to hata sakte ho

const baseUrl = process.env.BASE_URL || "http://localhost:5000";

// -------------------- Helper: Get Liked Products --------------------
const getLikedProductIds = async (userId) => {
  if (!userId) return [];
  const likes = await Like.find({ user: userId }).select("product");
  return likes.map((l) => l.product.toString());
};

// -------------------- Create Category --------------------
export const createCategory = async (req, res) => {
  try {
    const { name, description, slug } = req.body;
    const existing = await Category.findOne({ name });

    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    // Handle image upload if provided
    let imageUrl = null;
    if (req.file) {
      const normalizedPath = req.file.path.replace(/\\/g, "/").replace("uploads/", "");
      imageUrl = `${baseUrl}/uploads/${normalizedPath}`;
    }

    const category = await Category.create({ name, slug, description, imageUrl });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

// -------------------- Get All Categories (with few products) --------------------
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();

    // For each category, get some products belonging to that category
    const categoriesWithProducts = await Promise.all(
      categories.map(async (category) => {
        const products = await Product.find({ category: category._id })
          .select("name price images finalPrice discount avgRating ratingCount")
          .limit(4); // Limit to 4 products per category

        return {
          ...category.toObject(),
          products: products.map((product) => {
            const avgRating = product.avgRating || 0;
            const numReviews = product.ratingCount || 0;

            return {
              _id: product._id,
              name: product.name,
              price: product.finalPrice || product.price,
              mrp: product.price,
              discountPercent: product.discount > 0 ? product.discount : 0,
              images: product.images,
              thumbnail:
                product.images && product.images.length > 0
                  ? product.images[0]
                  : null,
              // rating info (for home page cards)
              avgRating,
              numReviews,
              rating: avgRating,
              reviewCount: numReviews,
            };
          }),
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: categoriesWithProducts,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

// -------------------- Get Single Category by ID --------------------
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category fetched successfully",
      data: category,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// -------------------- Get Products by Category --------------------
export const getProductsByCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check category
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Fetch products with category populated (if needed)
    const products = await Product.find({ category: id })
      .populate("category")
      .select("name price images finalPrice discount avgRating ratingCount tags stock");

    // User (if logged in)
    const userId = req.user ? req.user._id.toString() : null;

    let likedProductIds = [];
    let cartProductIds = [];

    if (userId) {
      likedProductIds = await getLikedProductIds(userId);

      const cart = await Cart.findOne({ user: userId });
      if (cart) {
        cartProductIds = cart.items.map((item) => item.product.toString());
      }
    }

    // Process products with rating and user-specific data
    const processedProducts = products.map((p) => {
      // Use the pre-calculated avgRating and ratingCount from the product
      const avgRating = p.avgRating || 0;
      const numReviews = p.ratingCount || 0;

      const isLiked = userId ? likedProductIds.includes(p._id.toString()) : false;
      const inCart = userId ? cartProductIds.includes(p._id.toString()) : false;

      return {
        ...p.toObject(),
        avgRating,
        numReviews,
        // Backward-compatible fields
        rating: avgRating,
        reviewCount: numReviews,
        isLiked,
        inCart,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: {
        category,
        products: processedProducts,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// -------------------- Update Category --------------------
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, slug, imageUrl } = req.body;

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Check if name is being changed and if it already exists
    if (name && name !== category.name) {
      const existing = await Category.findOne({ name });
      if (existing) {
        return res
          .status(400)
          .json({ success: false, message: "Category with this name already exists" });
      }
      category.name = name;
    }

    // Update description if provided
    if (description !== undefined) {
      category.description = description;
    }

    // Update slug if provided
    if (slug !== undefined) {
      category.slug = slug;
    }

    // Handle image update if provided
    if (req.file) {
      const normalizedPath = req.file.path.replace(/\\/g, "/").replace("uploads/", "");
      category.imageUrl = `${baseUrl}/uploads/${normalizedPath}`;
    }
    // Allow explicit removal of image by setting imageUrl to null/empty
    else if (imageUrl === null || imageUrl === "") {
      category.imageUrl = null;
    }

    const updatedCategory = await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

// -------------------- Delete Category --------------------
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if there are products in this category
    const productCount = await Product.countDocuments({ category: id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete category with existing products. Please remove products first.",
      });
    }

    await category.deleteOne(); // Use deleteOne() instead of remove()

    return res.status(200).json({
      success: true,
      message: "Category removed successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};
