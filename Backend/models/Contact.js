const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    jobTitle: { type: String, default: "", trim: true },
    source: { type: String, default: "", trim: true }, // website, referral, campaign, manual
    tags: [{ type: String, trim: true }],
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

contactSchema.index({ user: 1, createdAt: -1 });
contactSchema.index({ user: 1, email: 1 });
contactSchema.index({ user: 1, company: 1 });

module.exports = mongoose.model("Contact", contactSchema);
