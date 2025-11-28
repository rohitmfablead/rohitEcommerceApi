import express from "express";
import { 
  getCart, 
  addToCart,
  updateCartItem,
  removeItemFromCart,
  clearCart
} from "../controllers/cartController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getCart);
router.post("/", protect, addToCart);
router.put("/item", protect, updateCartItem);
router.delete("/item", protect, removeItemFromCart);
router.delete("/", protect, clearCart);

export default router;