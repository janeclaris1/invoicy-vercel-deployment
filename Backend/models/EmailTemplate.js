const mongoose = require("mongoose");

const emailTemplateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    subject: { type: String, default: "" },
    body: { type: String, default: "" },
  },
  { timestamps: true }
);

emailTemplateSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("EmailTemplate", emailTemplateSchema);
