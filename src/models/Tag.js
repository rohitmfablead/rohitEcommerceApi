import mongoose from "mongoose";

const tagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, unique: true },
  description: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Generate slug from name before saving
tagSchema.pre('save', function(next) {
  if (this.name && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  next();
});

export default mongoose.model("Tag", tagSchema);