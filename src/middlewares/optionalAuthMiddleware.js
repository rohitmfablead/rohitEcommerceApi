// src/middlewares/optionalAuthMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");
    } catch (error) {
      // Agar token galat / expire hai to user ko ignore karenge
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
};
