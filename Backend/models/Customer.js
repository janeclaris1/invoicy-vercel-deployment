const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    company: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
    taxId: { type: String, default: "", trim: true },
    currency: { type: String, default: "GHS", trim: true },
  },
  { timestamps: true }
);

customerSchema.index({ user: 1, createdAt: -1 });
customerSchema.index({ user: 1, email: 1 });
customerSchema.index({ user: 1, name: 1 });

module.exports = mongoose.model("Customer", customerSchema);
