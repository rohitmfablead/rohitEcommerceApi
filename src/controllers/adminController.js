import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Category from "../models/Category.js";

// @desc    Get comprehensive admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    // Execute all queries in parallel for better performance
    const [
      totalUsers,
      totalProducts,
      totalCategories,
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      revenueData,
      recentOrders,
      lowStockProducts,
      topSellingProducts,
      salesData
    ] = await Promise.all([
      // User statistics
      User.countDocuments({ role: { $ne: "admin" } }),
      
      // Product statistics
      Product.countDocuments(),
      Category.countDocuments(),
      
      // Order statistics
      Order.countDocuments(),
      Order.countDocuments({ status: "pending" }),
      Order.countDocuments({ status: "processing" }),
      Order.countDocuments({ status: "shipped" }),
      Order.countDocuments({ status: "delivered" }),
      Order.countDocuments({ status: "cancelled" }),
      
      // Revenue data
      Order.aggregate([
        { $match: { status: { $in: ["delivered", "Paid"] } } },
        { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } }
      ]),
      
      // Recent orders (last 5)
      Order.find()
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .limit(5),
      
      // Low stock products (less than 10 items)
      Product.find({ stock: { $lt: 10 } })
        .sort({ stock: 1 })
        .limit(10),
      
      // Top selling products (by order count)
      Order.aggregate([
        { $unwind: "$items" },
        { $group: { _id: "$items.product", totalSold: { $sum: "$items.quantity" } } },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product"
          }
        },
        { $unwind: "$product" },
        { $project: { 
            _id: "$product._id",
            name: "$product.name",
            totalSold: 1
          } 
        }
      ]),
      
      // Sales data for the last 30 days
      Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            status: { $in: ["delivered", "Paid"] }
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            totalSales: { $sum: "$totalPrice" },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const totalRevenue = revenueData[0] ? revenueData[0].totalRevenue : 0;

    res.json({ 
      success: true,
      data: {
        totals: {
          users: totalUsers,
          products: totalProducts,
          categories: totalCategories,
          orders: totalOrders,
          revenue: totalRevenue
        },
        orderStatus: {
          pending: pendingOrders,
          processing: processingOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders
        },
        recentOrders,
        lowStockProducts,
        topSellingProducts,
        salesData
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};