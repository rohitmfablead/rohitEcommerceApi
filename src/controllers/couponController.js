import Coupon from "../models/Coupon.js";

// @desc    Create a new coupon
// @route   POST /api/coupons
// @access  Private/Admin
export const createCoupon = async (req, res) => {
  const {
    code,
    discountType,
    discountValue,
    minOrderAmount,
    maxDiscountAmount,
    expiryDate,
    isActive,
    usageLimit
  } = req.body;

  // Check if coupon already exists
  const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
  if (couponExists) {
    res.status(400);
    throw new Error("Coupon already exists with this code");
  }

  // Create coupon
  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    discountType,
    discountValue,
    minOrderAmount,
    maxDiscountAmount,
    expiryDate,
    isActive,
    usageLimit
  });

  res.status(201).json(coupon);
};

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private/Admin
export const getCoupons = async (req, res) => {
  const coupons = await Coupon.find({});
  res.json(coupons);
};

// @desc    Get coupon by ID
// @route   GET /api/coupons/:id
// @access  Private/Admin
export const getCouponById = async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  
  if (coupon) {
    res.json(coupon);
  } else {
    res.status(404);
    throw new Error("Coupon not found");
  }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private/Admin
export const updateCoupon = async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  
  if (coupon) {
    const {
      code,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      expiryDate,
      isActive,
      usageLimit
    } = req.body;

    // Check if code is being changed and if it already exists
    if (code && code.toUpperCase() !== coupon.code) {
      const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
      if (couponExists) {
        res.status(400);
        throw new Error("Coupon already exists with this code");
      }
      coupon.code = code.toUpperCase();
    }

    coupon.discountType = discountType || coupon.discountType;
    coupon.discountValue = discountValue || coupon.discountValue;
    coupon.minOrderAmount = minOrderAmount || coupon.minOrderAmount;
    coupon.maxDiscountAmount = maxDiscountAmount || coupon.maxDiscountAmount;
    coupon.expiryDate = expiryDate || coupon.expiryDate;
    coupon.isActive = isActive !== undefined ? isActive : coupon.isActive;
    coupon.usageLimit = usageLimit || coupon.usageLimit;

    const updatedCoupon = await coupon.save();
    res.json(updatedCoupon);
  } else {
    res.status(404);
    throw new Error("Coupon not found");
  }
};

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    await coupon.deleteOne(); // Use deleteOne() instead of remove()
    res.json({ message: "Coupon removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Apply coupon
// @route   POST /api/coupons/apply
// @access  Private
export const applyCoupon = async (req, res) => {
  const { code, cartTotal } = req.body;

  // Find coupon
  const coupon = await Coupon.findOne({ 
    code: code.toUpperCase(),
    isActive: true,
    expiryDate: { $gt: Date.now() }
  });

  if (!coupon) {
    res.status(404);
    throw new Error("Coupon is invalid or expired");
  }

  // Check if coupon usage limit exceeded
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    res.status(400);
    throw new Error("Coupon usage limit exceeded");
  }

  // Check minimum order amount
  if (cartTotal < coupon.minOrderAmount) {
    res.status(400);
    throw new Error(`Minimum order amount is $${coupon.minOrderAmount}`);
  }

  // Calculate discount
  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = (cartTotal * coupon.discountValue) / 100;
    // Apply max discount limit if set
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
  } else {
    discount = coupon.discountValue;
    // Ensure discount doesn't exceed cart total
    if (discount > cartTotal) {
      discount = cartTotal;
    }
  }

  res.json({
    coupon,
    discount,
    totalAfterDiscount: cartTotal - discount
  });
};