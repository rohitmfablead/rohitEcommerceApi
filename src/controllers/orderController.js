import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Address from "../models/Address.js";
import { createNotification } from "./notificationController.js";

// -------------------- Create Order --------------------
export const createOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod, couponCode } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product"
    );
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Get shipping address
    const address = await Address.findById(addressId);
    if (!address) {
      return res.status(400).json({ message: "Invalid shipping address" });
    }

    // Calculate total price
    let totalPrice = cart.items.reduce(
      (acc, item) => acc + item.product.price * item.quantity,
      0
    );

    // Apply coupon if provided
    let discount = 0;
    if (couponCode) {
      // TODO: real coupon validation
      discount = totalPrice * 0.1; // 10% dummy
    }

    const discountedPrice = totalPrice - discount;

    // Create order items with price at time of order
    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.product.price,
    }));

    // Create order
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress: {
        address: address.address,
        city: address.city,
        postalCode: address.postalCode,
        country: address.country,
      },
      totalPrice,
      discountedPrice,
      coupon: couponCode ? { code: couponCode, discount } : undefined,
      paymentMethod: paymentMethod || "COD",
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

    // Create notification for user
    await createNotification({
      user: req.user._id,
      title: "Order Placed",
      message: `Your order #${order._id} has been placed successfully`,
      type: "order",
    });

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
        .populate("items.product", "name price images")
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
      .populate("items.product", "name price images")
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
      "name price images"
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

    // Notification
    await createNotification({
      user: req.user._id,
      title: "Order Cancelled",
      message: `Your order #${order._id} has been cancelled`,
      type: "order",
    });

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

    await createNotification({
      user: order.user,
      title: "Order Status Updated",
      message: `Your order #${order._id} status has been updated from ${previousStatus} to ${status}`,
      type: "order",
    });

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

    await createNotification({
      user: order.user,
      title: "Payment Status Updated",
      message: `Payment status for order #${order._id} is now ${paymentStatus}`,
      type: "order",
    });

    return res.json(order);
  } catch (err) {
    console.error("Update Payment Status Error:", err);
    return res.status(500).json({ message: err.message });
  }
};
