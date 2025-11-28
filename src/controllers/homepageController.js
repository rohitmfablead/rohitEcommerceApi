// src/controllers/homepageController.js
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Banner from "../models/Banner.js";
import Coupon from "../models/Coupon.js";
import CMS from "../models/CMS.js";
import Cart from "../models/Cart.js";
import Like from "../models/Like.js";
import asyncHandler from "express-async-handler";

// -------------------- Helper: Get Liked Products --------------------
const getLikedProductIds = async (userId) => {
  if (!userId) return [];
  const likes = await Like.find({ user: userId }).select("product");
  return likes.map((l) => l.product.toString());
};

// -------------------- Get Homepage Data --------------------
export const getHomepageData = asyncHandler(async (req, res) => {
  try {
    const userId = req.user ? req.user._id.toString() : null;

    // 1. Banners
    const banners = await Banner.find({ isActive: true })
      .sort({ position: 1, createdAt: -1 })
      .limit(10);

    // 2. Categories + product counts
    const categoriesWithCounts = await Category.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "category",
          as: "products",
        },
      },
      {
        $project: {
          name: 1,
          slug: 1,
          description: 1,
          imageUrl: 1,
          productCount: { $size: "$products" },
        },
      },
    ]);

    // 3. Featured products
    const featuredProducts = await Product.find({ tags: "featured" })
      .populate("category")
      .sort({ createdAt: -1 })
      .limit(10);

    // 4. Best sellers (ratingCount > 0)
    const bestSellers = await Product.find({
      ratingCount: { $gt: 0 },
    })
      .sort({ ratingCount: -1 })
      .limit(10);

    // 5. New arrivals (latest)
    const newArrivals = await Product.find({})
      .sort({ createdAt: -1 })
      .limit(10);

    // 6. Deal of the day (any discounted product)
    const dealOfTheDay = await Product.findOne({
      discount: { $gt: 0 },
    }).sort({ createdAt: -1 });

    // 7. Coupons
    const coupons = await Coupon.find({
      isActive: true,
      expiryDate: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(5);

    // 8. CMS sections
    const cmsSections = await CMS.find({ isActive: true });

    // 9. Process products with user-specific data
    const processProducts = async (products) => {
      let likedProductIds = [];
      let cartProductIds = [];
      let cartItems = {};

      if (userId) {
        likedProductIds = await getLikedProductIds(userId);
        const cart = await Cart.findOne({ user: userId });
        if (cart) {
          cartProductIds = cart.items.map((item) =>
            item.product.toString()
          );
          cart.items.forEach((item) => {
            cartItems[item.product.toString()] = item;
          });
        }
      }

      return products.map((p) => {
        const avgRating =
          typeof p.avgRating === "number" ? p.avgRating : 0;
        const numReviews =
          typeof p.ratingCount === "number" ? p.ratingCount : 0;

        const mrp = p.price;
        const price = p.finalPrice || p.price;
        const discountPercent =
          mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

        return {
          _id: p._id,
          name: p.name,
          slug: p.name
            .toLowerCase()
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          description: p.description,
          price: price,
          mrp: mrp,
          discountPercent,
          currency: "INR",
          images: p.images,
          thumbnail:
            p.images && p.images.length > 0 ? p.images[0] : null,
          category: p.category,
          brand: "Generic",
          rating: avgRating,
          numReviews: numReviews,
          stock: p.stock,
          isInStock: p.stock > 0,
          labels: p.tags || [],
          isLiked: userId
            ? likedProductIds.includes(p._id.toString())
            : false,
          inCart: userId
            ? cartProductIds.includes(p._id.toString())
            : false,
          cartItem: cartItems[p._id.toString()]
            ? {
                cartItemId: cartItems[p._id.toString()]._id,
                quantity: cartItems[p._id.toString()].quantity,
              }
            : null,
          createdAt: p.createdAt,
        };
      });
    };

    // Process banners
    const processedBanners = banners.map((banner) => ({
      _id: banner._id,
      title: banner.title,
      subtitle: banner.description,
      imageUrl: banner.imageUrl,
      mobileImageUrl: banner.imageUrl,
      ctaText: "Shop Now",
      linkType: "category",
      link: banner.link || "/",
      position: banner.position,
      isActive: banner.isActive,
    }));

    // Process categories + sample products
    const processedCategories = await Promise.all(
      categoriesWithCounts.map(async (category) => {
        const categoryProducts = await Product.find({
          category: category._id,
        })
          .limit(4)
          .select("name price images finalPrice discount");

        return {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          icon: "ri-box-line",
          imageUrl: category.imageUrl || null,
          parent: null,
          productCount: category.productCount,
          products: categoryProducts.map((product) => ({
            _id: product._id,
            name: product.name,
            price: product.finalPrice || product.price,
            mrp: product.price,
            discountPercent:
              product.discount > 0 ? product.discount : 0,
            images: product.images,
            thumbnail:
              product.images && product.images.length > 0
                ? product.images[0]
                : null,
          })),
        };
      })
    );

    const processedFeaturedProducts = await processProducts(
      featuredProducts
    );
    const processedBestSellers = await processProducts(bestSellers);
    const processedNewArrivals = await processProducts(newArrivals);

    const processedDealOfTheDay = dealOfTheDay
      ? {
          _id: "deal-of-the-day",
          title: "Deal of the Day",
          product: (await processProducts([dealOfTheDay]))[0],
        }
      : null;

    const processedCoupons = coupons.map((coupon) => ({
      code: coupon.code,
      title: `${
        coupon.discountType === "percentage"
          ? `${coupon.discountValue}%`
          : `₹${coupon.discountValue}`
      } OFF`,
      description: `Min cart value ₹${coupon.minOrderAmount || 0}`,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscount: coupon.maxDiscountAmount || null,
      validTill: coupon.expiryDate,
    }));

    const cmsData = {};
    cmsSections.forEach((cms) => {
      if (cms.slug === "top-strip") {
        cmsData.topStrip = {
          text: cms.content,
          backgroundColor: "#111827",
          textColor: "#F9FAFB",
        };
      } else if (cms.slug === "why-choose-us") {
        cmsData.staticBlocks = [
          {
            key: "why-choose-us",
            title: cms.title,
            items: [
              {
                icon: "ri-truck-line",
                title: "Fast Delivery",
                description:
                  "Express shipping available on most products.",
              },
              {
                icon: "ri-shield-check-line",
                title: "Secure Payments",
                description: "100% secure & verified payments.",
              },
            ],
          },
        ];
      }
    });

    cmsData.seo = {
      title: "Online Shopping Site for Electronics, Fashion & More",
      description:
        "Shop latest mobiles, gadgets, fashion and more at best prices.",
      keywords: ["online shopping", "electronics", "fashion", "best price"],
    };

    res.json({
      success: true,
      message: "Home data fetched successfully",
      data: {
        banners: processedBanners,
        categories: processedCategories,
        featuredProducts: processedFeaturedProducts,
        bestSellers: processedBestSellers,
        newArrivals: processedNewArrivals,
        offers: {
          dealOfTheDay: processedDealOfTheDay,
          coupons: processedCoupons,
        },
        cmsSections: cmsData,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
