import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Address from "../models/Address.js";
// Import notification helper
import { createNotification } from "./notificationController.js";

export const createOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod, couponCode } = req.body;
    
    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
    if (!cart || cart.items.length === 0) return res.status(400).json({ message: "Cart is empty" });
    
    // Get shipping address
    const address = await Address.findById(addressId);
    if (!address) return res.status(400).json({ message: "Invalid shipping address" });
    
    // Calculate total price
    let totalPrice = cart.items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    
    // Apply coupon if provided
    let discount = 0;
    if (couponCode) {
      // In a real implementation, you would validate the coupon here
      // For now, we'll just simulate a 10% discount
      discount = totalPrice * 0.1;
    }
    
    const discountedPrice = totalPrice - discount;
    
    // Create order items with price at time of order
    const orderItems = cart.items.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.product.price
    }));
    
    // Create order
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress: {
        address: address.address,
        city: address.city,
        postalCode: address.postalCode,
        country: address.country
      },
      totalPrice,
      discountedPrice,
      coupon: couponCode ? { code: couponCode, discount } : undefined,
      paymentMethod: paymentMethod || "COD"
    });
    
    // Update product stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity }
      });
    }
    
    // Clear cart
    cart.items = [];
    await cart.save();
    
    // Create notification for user
    await createNotification({
      user: req.user._id,
      title: "Order Placed",
      message: `Your order #${order._id} has been placed successfully`,
      type: "order"
    });
    
    // Create notification for admin
    await createNotification({
      admin: true,
      title: "New Order",
      message: `New order #${order._id} placed by user ${req.user._id}`,
      type: "order"
    });
    
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role === "admin") {
      // Admin can get all orders
      const orders = await Order.find()
        .populate("user", "name email")
        .populate("items.product", "name price images")
        .sort({ createdAt: -1 });
      return res.json(orders);
    }
    
    // Regular user can only get their own orders
    const orders = await Order.find({ user: req.user._id })
      .populate("items.product", "name price images")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    }).populate("items.product", "name price images");
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cancel order (if status allows)
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check if order can be cancelled
    if (order.status !== "pending" && order.status !== "processing") {
      return res.status(400).json({ message: "Order cannot be cancelled at this stage" });
    }
    
    order.status = "cancelled";
    await order.save();
    
    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }
    
    // Create notification
    await createNotification({
      user: req.user._id,
      title: "Order Cancelled",
      message: `Your order #${order._id} has been cancelled`,
      type: "order"
    });
    
    res.json({ message: "Order cancelled successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Validate status
    const validStatuses = ["pending", "processing", "shipped", "out-for-delivery", "delivered", "cancelled", "returned", "Paid"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    
    const previousStatus = order.status;
    order.status = status;
    
    // Update payment status if needed
    if (status === "Paid") {
      order.isPaid = true;
      order.paidAt = Date.now();
    }
    
    // Update delivery status if needed
    if (status === "delivered") {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }
    
    await order.save();
    
    // Create notification for user
    await createNotification({
      user: order.user,
      title: "Order Status Updated",
      message: `Your order #${order._id} status has been updated to ${status}`,
      type: "order"
    });
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};