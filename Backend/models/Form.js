const mongoose = require("mongoose");

const formSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    /** Array of { id, label, type: 'email'|'text'|'phone'|'select'|'textarea', required, options? } */
    fields: { type: Array, default: [] },
    submitButtonText: { type: String, default: "Submit" },
    redirectUrl: { type: String, default: "" },
    listId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketingList", default: null },
  },
  { timestamps: true }
);

formSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Form", formSchema);
