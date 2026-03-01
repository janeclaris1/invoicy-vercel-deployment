const mongoose = require("mongoose");

const poLineSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    quantity: { type: Number, required: true, min: 0 },
    quantityReceived: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    unit: { type: String, default: "" },
  },
  { _id: true }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", default: null },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    orderNumber: { type: String, required: true, trim: true },
    status: { type: String, enum: ["draft", "sent", "partial", "received", "cancelled"], default: "draft" },
    orderDate: { type: Date, default: Date.now },
    expectedDate: { type: Date, default: null },
    receivedAt: { type: Date, default: null },
    lines: [poLineSchema],
    notes: { type: String, default: "" },
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: "GHS" },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ user: 1, orderNumber: 1 });
purchaseOrderSchema.index({ user: 1, status: 1 });
purchaseOrderSchema.index({ supplier: 1 });

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
