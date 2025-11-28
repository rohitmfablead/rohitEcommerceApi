import Address from "../models/Address.js";

// -------------------- Create Address --------------------
export const createAddress = async (req, res) => {
  try {
    const userId = req.user._id;

    const newAddress = new Address({
      ...req.body,
      user: userId,
    });

    // If user has no addresses yet, make this default
    const addressCount = await Address.countDocuments({ user: userId });
    if (addressCount === 0) newAddress.isDefault = true;

    await newAddress.save();
    res.status(201).json({ message: "Address added successfully", address: newAddress });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- Get All Addresses --------------------
export const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- Update Address --------------------
export const updateAddress = async (req, res) => {
  try {
    const updated = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Address not found" });
    res.json({ message: "Address updated", address: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- Delete Address --------------------
export const deleteAddress = async (req, res) => {
  try {
    const deleted = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) return res.status(404).json({ message: "Address not found" });
    res.json({ message: "Address deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------- Set Default Address --------------------
export const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user._id;

    await Address.updateMany({ user: userId }, { isDefault: false });
    const defaultAddr = await Address.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      { isDefault: true },
      { new: true }
    );

    res.json({ message: "Default address set", address: defaultAddr });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
