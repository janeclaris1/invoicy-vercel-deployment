const mongoose = require("mongoose");

const workflowSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    triggerType: {
      type: String,
      enum: ["signup", "invoice_sent", "invoice_paid", "manual"],
      default: "manual",
    },
    triggerConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    actions: [
      {
        type: { type: String, enum: ["send_email", "add_tag", "notify"], default: "send_email" },
        config: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

workflowSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Workflow", workflowSchema);
