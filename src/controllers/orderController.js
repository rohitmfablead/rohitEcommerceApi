import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Address from "../models/Address.js";
import Coupon from "../models/Coupon.js";
import { createNotification } from "./notificationController.js";
import { sendEmail, emailTemplates } from "../utils/emailService.js";
import User from "../models/User.js";
import Setting from "../models/Setting.js";

// -------------------- Create Order --------------------
export const createOrder = async (req, res) => {
  try {
    const { addressId, shippingAddress, paymentMethod, couponCode, discount = 0 } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product"
    );
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Get shipping address - either from DB lookup or directly from request
    let address;
    if (addressId) {
      // Get address from database
      address = await Address.findById(addressId);
      if (!address) {
        return res.status(400).json({ message: "Invalid shipping address" });
      }
    } else if (shippingAddress) {
      // Use address directly from request
      address = shippingAddress;
    } else {
      return res.status(400).json({ message: "Shipping address is required" });
    }

    // Calculate subtotal using product final prices (accounting for product-level discounts)
    let subtotal = cart.items.reduce(
      (acc, item) => {
        // Use finalPrice if available (product-level discount), otherwise use base price
        const itemPrice = item.product.finalPrice || item.product.price;
        return acc + itemPrice * item.quantity;
      },
      0
    );

    // Apply coupon if provided
    let couponDiscount = 0;
    let couponData = null;
    if (couponCode) {
      // Find and validate coupon
      const coupon = await Coupon.findOne({ 
        code: couponCode.toUpperCase(),
        isActive: true,
        expiryDate: { $gt: Date.now() }
      });

      if (coupon) {
        // Check if coupon usage limit exceeded
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
          return res.status(400).json({ message: "Coupon usage limit exceeded" });
        }

        // Check minimum order amount
        if (subtotal < coupon.minOrderAmount) {
          return res.status(400).json({ 
            message: `Minimum order amount is ₹${coupon.minOrderAmount}` 
          });
        }

        // Calculate coupon discount
        if (coupon.discountType === "percentage") {
          couponDiscount = (subtotal * coupon.discountValue) / 100;
          // Apply max discount limit if set
          if (coupon.maxDiscountAmount && couponDiscount > coupon.maxDiscountAmount) {
            couponDiscount = coupon.maxDiscountAmount;
          }
        } else {
          couponDiscount = coupon.discountValue;
          // Ensure discount doesn't exceed subtotal
          if (couponDiscount > subtotal) {
            couponDiscount = subtotal;
          }
        }
        
        couponData = {
          code: coupon.code,
          discount: couponDiscount
        };
        
        // Update coupon usage count
        coupon.usedCount += 1;
        await coupon.save();
      } else {
        return res.status(400).json({ message: "Invalid or expired coupon" });
      }
    }

    // Get settings for shipping calculation and payment validation
    const settings = await Setting.getSettings();
    
    // Validate payment method based on settings
    const selectedPaymentMethod = paymentMethod || "COD";
    if (selectedPaymentMethod === "COD" && !settings.codEnabled) {
      return res.status(400).json({ message: "Cash on Delivery is not available" });
    }

    // Calculate delivery charges based on settings
    let deliveryCharges = 0;
    
    // Check if order qualifies for free shipping
    if (subtotal >= settings.freeShippingThreshold) {
      deliveryCharges = 0; // Free shipping
    } else {
      // Apply flat shipping rate
      deliveryCharges = settings.flatShippingRate;
    }

    // Calculate total amount
    // Apply either generic discount OR coupon discount (not both), and delivery charges
    // If coupon is applied, ignore the generic discount field
    const effectiveDiscount = couponCode ? couponDiscount : discount;
    const discountedSubtotal = subtotal - effectiveDiscount;
    const totalAmount = discountedSubtotal + deliveryCharges;

    // Round totalAmount to 2 decimal places to avoid floating point issues
    const roundedTotalAmount = Math.round(totalAmount * 100) / 100;

    // Create order items with price at time of order (using finalPrice if available)
    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      quantity: item.quantity,
      // Use finalPrice if available (product-level discount), otherwise use base price
      price: item.product.finalPrice || item.product.price,
    }));

    // Create order
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress: addressId ? {
        // If address came from DB, map the fields
        fullName: address.fullName,
        phoneNumber: address.phoneNumber,
        address: address.street,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      } : {
        // If address came directly from request, use it as-is
        ...address
      },
      // Store detailed pricing information
      subtotal: subtotal,
      discount: couponCode ? 0 : discount, // Generic discount (0 if coupon is applied)
      couponDiscount: couponDiscount,
      deliveryCharges: deliveryCharges,
      totalPrice: roundedTotalAmount,
      discountedPrice: roundedTotalAmount, // For backward compatibility
      coupon: couponData,
      paymentMethod: selectedPaymentMethod,
      // default: status = "pending", isPaid = false, paymentStatus = "pending"
    });

    // Update product stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity },
      });
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    // Get user email
    const user = await User.findById(req.user._id);

    // Create notification for user
    await createNotification({
      user: req.user._id,
      title: "Order Placed",
      message: `Your order #${order._id} has been placed successfully`,
      type: "order",
    });

    // Send email notification to user
    try {
      await sendEmail(
        user.email,
        `Order Confirmation #${order._id}`,
        emailTemplates.orderConfirmation(order)
      );
    } catch (emailError) {
      console.error("Failed to send order confirmation email:", emailError);
    }

    // Create notification for admin
    await createNotification({
      admin: true,
      title: "New Order",
      message: `New order #${order._id} placed by user ${req.user._id}`,
      type: "order",
    });

    return res.status(201).json(order);
  } catch (err) {
    console.error("Create Order Error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// -------------------- Get Orders (Admin/User) --------------------
export const getOrders = async (req, res) => {
  try {
    let orders;

    // Admin: get all orders
    if (req.user.role === "admin") {
      orders = await Order.find()
        .populate("user", "name email")
        .populate("items.product", "name price finalPrice images")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        message: "All orders fetched successfully",
        count: orders.length,
        orders,
      });
    }

    // User: get own orders
    orders = await Order.find({ user: req.user._id })
      .populate("items.product", "name price finalPrice images")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Your orders fetched successfully",
      count: orders.length,
      orders,
    });
  } catch (err) {
    console.error("Get Orders Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: err.message,
    });
  }
};

// -------------------- Get Order By ID --------------------
export const getOrderById = async (req, res) => {
  try {
    const query =
      req.user.role === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, user: req.user._id };

    const order = await Order.findOne(query).populate(
      "items.product",
      "name price finalPrice images"
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json(order);
  } catch (err) {
    console.error("Get Order By ID Error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// -------------------- Cancel Order (User) --------------------
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if order can be cancelled
    if (order.status !== "pending" && order.status !== "processing") {
      return res
        .status(400)
        .json({ message: "Order cannot be cancelled at this stage" });
    }

    order.status = "cancelled";
    await order.save();

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    // Get user email
    const user = await User.findById(req.user._id);

    // Notification
    await createNotification({
      user: req.user._id,
      title: "Order Cancelled",
      message: `Your order #${order._id} has been cancelled`,
      type: "order",
    });

    // Send email notification to user
    try {
      await sendEmail(
        user.email,
        `Order Cancellation #${order._id}`,
        emailTemplates.orderCancellation(order)
      );
    } catch (emailError) {
      console.error("Failed to send order cancellation email:", emailError);
    }

    return res.json({ message: "Order cancelled successfully" });
  } catch (err) {
    console.error("Cancel Order Error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// -------------------- Update Order Status (Admin) --------------------
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "out-for-delivery",
      "delivered",
      "cancelled",
      "returned",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const previousStatus = order.status;
    order.status = status;

    if (status === "delivered") {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    await order.save();

    // Get user email
    const user = await User.findById(order.user);

    await createNotification({
      user: order.user,
      title: "Order Status Updated",
      message: `Your order #${order._id} status has been updated from ${previousStatus} to ${status}`,
      type: "order",
    });

    // Send email notification to user
    try {
      await sendEmail(
        user.email,
        `Order Status Update #${order._id}`,
        emailTemplates.orderStatusUpdate(order, previousStatus)
      );
    } catch (emailError) {
      console.error("Failed to send order status update email:", emailError);
    }

    return res.json(order);
  } catch (err) {
    console.error("Update Order Status Error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// -------------------- Update Payment Status (Admin) --------------------
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body; // "paid" | "pending" | "failed"

    const validPaymentStatuses = ["pending", "paid", "failed"];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.paymentStatus = paymentStatus;
    order.isPaid = paymentStatus === "paid";

    if (order.isPaid) {
      order.paidAt = Date.now();
    } else {
      order.paidAt = undefined;
    }

    await order.save();

    // Get user email
    const user = await User.findById(order.user);

    await createNotification({
      user: order.user,
      title: "Payment Status Updated",
      message: `Payment status for order #${order._id} is now ${paymentStatus}`,
      type: "order",
    });

    // Send email notification to user when payment is successful
    if (paymentStatus === "paid") {
      try {
        await sendEmail(
          user.email,
          `Payment Confirmation #${order._id}`,
          emailTemplates.paymentConfirmation(order)
        );
      } catch (emailError) {
        console.error("Failed to send payment confirmation email:", emailError);
      }
    }

    return res.json(order);
  } catch (err) {
    console.error("Update Payment Status Error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// -------------------- Request Return/Refund --------------------
export const requestReturn = async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    // Find the order
    const order = await Order.findById(orderId).populate("user");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user is authorized to request return
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Check if order is eligible for return (must be delivered)
    if (order.status !== "delivered") {
      return res.status(400).json({ message: "Order must be delivered to request return" });
    }

    // Update order status to "return-requested"
    order.status = "return-requested";
    order.returnReason = reason;
    await order.save();

    // Get all admin users
    const admins = await User.find({ role: "admin" });

    // Create notification for each admin
    for (const admin of admins) {
      await createNotification({
        user: admin._id,
        title: "Return/Refund Request",
        message: `A return/refund request has been submitted for order #${order._id}`,
        type: "order",
      });
      
      // Send email notification to admin
      try {
        await sendEmail(
          admin.email,
          `Return Request: Order #${order._id}`,
          emailTemplates.returnRefundRequest(order)
        );
      } catch (emailError) {
        console.error("Failed to send return request email to admin:", emailError);
      }
    }

    // Also notify the user
    await createNotification({
      user: order.user._id,
      title: "Return Request Submitted",
      message: `Your return request for order #${order._id} has been submitted`,
      type: "order",
    });

    return res.json({ 
      message: "Return request submitted successfully",
      order 
    });
  } catch (err) {
    console.error("Request Return Error:", err);
    return res.status(500).json({ message: err.message });
  }
};
