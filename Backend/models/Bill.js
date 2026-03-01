const mongoose = require("mongoose");

const billLineSchema = new mongoose.Schema({
  description: { type: String, default: "" },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  expenseAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
});

const billSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    billNumber: { type: String, required: true, trim: true },
    vendorName: { type: String, required: true, trim: true },
    vendorId: { type: String, default: "" },
    vendorEmail: { type: String, default: "" },
    vendorAddress: { type: String, default: "" },
    billDate: { type: Date, default: Date.now },
    dueDate: { type: Date, default: null },
    lineItems: [billLineSchema],
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    currency: { type: String, default: "GHS" },
    status: { type: String, enum: ["draft", "open", "partial", "paid", "cancelled"], default: "draft" },
    notes: { type: String, default: "" },
    journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: "JournalEntry", default: null },
  },
  { timestamps: true }
);

billSchema.index({ user: 1, billNumber: 1 }, { unique: true });
billSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("Bill", billSchema);
