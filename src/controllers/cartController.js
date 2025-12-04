import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { createNotification } from "./notificationController.js";
import { sendEmail, emailTemplates } from "../utils/emailService.js";
import User from "../models/User.js";

export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    // Check if product exists and has sufficient stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({ message: "Insufficient stock available" });
    }
    
    let cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      // Create new cart if doesn't exist
      cart = await Cart.create({ user: req.user._id, items: [{ product: productId, quantity }] });
    } else {
      // Check if product already in cart
      const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
      if (itemIndex > -1) {
        // If product exists, increase quantity
        const newQuantity = cart.items[itemIndex].quantity + quantity;
        
        // Check stock availability for the new quantity
        if (product.stock < newQuantity) {
          return res.status(400).json({ message: "Insufficient stock available" });
        }
        
        cart.items[itemIndex].quantity = newQuantity;
      } else {
        // Add new item to cart
        cart.items.push({ product: productId, quantity });
      }
      await cart.save();
    }
    
    // Populate product details before sending response
    await cart.populate("items.product");
    
    // Get user details for notification
    const user = await User.findById(req.user._id);
    
    // Create notification
    await createNotification({
      user: req.user._id,
      title: "Product Added to Cart",
      message: `You've added ${product.name} (Qty: ${quantity}) to your cart`,
      type: "cart",
      sendEmail: true
    });
    
    // Send email notification
    try {
      await sendEmail(
        user.email,
        `Added to Cart: ${product.name}`,
        emailTemplates.productAddedToCart(user, product, quantity)
      );
    } catch (emailError) {
      console.error("Failed to send cart addition email:", emailError);
    }
    
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update item quantity in cart
export const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    // Validate quantity
    if (quantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }
    
    // Check if product exists and has sufficient stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({ message: "Insufficient stock available" });
    }
    
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    
    // Find item in cart
    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }
    
    // Update quantity
    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    
    // Populate product details before sending response
    await cart.populate("items.product");
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Remove item from cart
export const removeItemFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    
    // Filter out the item to be removed
    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();
    
    // Populate product details before sending response
    await cart.populate("items.product");
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    
    cart.items = [];
    await cart.save();
    
    res.json({ message: "Cart cleared successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};