import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { createNotification } from "./notificationController.js";
import { sendEmail, emailTemplates } from "../utils/emailService.js";

const baseUrl = process.env.BASE_URL || "http://localhost:5000"; // Add base URL

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });


// ===================== REGISTER =====================
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const user = await User.create({ name, email, password, role });
    const token = generateToken(user._id);

    // Notify admins about new user registration
    const admins = await User.find({ role: "admin" });
    
    for (const admin of admins) {
      await createNotification({
        user: admin._id,
        title: "New User Registration",
        message: `A new user ${name} has registered with email ${email}`,
        type: "user",
      });
      
      // Send email notification to admin
      try {
        await sendEmail(
          admin.email,
          `New User Registration: ${name}`,
          emailTemplates.newUserRegistration(user)
        );
      } catch (emailError) {
        console.error("Failed to send new user registration email to admin:", emailError);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      token,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};


// ===================== LOGIN =====================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      token,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};