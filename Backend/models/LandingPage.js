const mongoose = require("mongoose");

const landingPageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    template: { type: String, default: "default" },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
  },
  { timestamps: true }
);

landingPageSchema.index({ user: 1, slug: 1 }, { unique: true });
landingPageSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("LandingPage", landingPageSchema);
