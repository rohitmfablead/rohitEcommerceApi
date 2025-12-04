import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Category from "../models/Category.js";
import { createNotification } from "./notificationController.js";
import { sendEmail, emailTemplates } from "../utils/emailService.js";

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
      paymentData
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
        .populate("items.product", "name price") // Add this to populate product details
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
      
      // Payment method distribution
      Order.aggregate([
        {
          $group: {
            _id: "$paymentMethod",
            count: { $sum: 1 },
            totalAmount: { $sum: "$totalPrice" }
          }
        },
        {
          $sort: { count: -1 }
        }
      ])
    ]);

    const totalRevenue = revenueData[0] ? revenueData[0].totalRevenue : 0;
    
    // Send low stock notifications if there are low stock products
    if (lowStockProducts && lowStockProducts.length > 0) {
      // Get all admin users
      const admins = await User.find({ role: "admin" });
      
      // Create notification for each admin
      for (const product of lowStockProducts) {
        for (const admin of admins) {
          await createNotification({
            user: admin._id,
            title: "Low Stock Warning",
            message: `Only ${product.stock} items left for ${product.name} (${product._id})`,
            type: "stock",
          });
          
          // Send email notification to admin
          try {
            await sendEmail(
              admin.email,
              `Low Stock Alert: ${product.name}`,
              emailTemplates.productLowStock(product)
            );
          } catch (emailError) {
            console.error("Failed to send low stock email to admin:", emailError);
          }
        }
      }
    }

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
        paymentData
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};