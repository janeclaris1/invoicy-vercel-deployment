const mongoose = require("mongoose");

const expenditureSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    expenseAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    paymentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    vendor: {
      type: String,
      default: "",
    },
    paymentMethod: {
      type: String,
      default: "",
    },
    reference: {
      type: String,
      default: "",
    },
    receiptImage: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "recorded"],
      default: "draft",
    },
    journalEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
      default: null,
    },
  },
  { timestamps: true }
);

expenditureSchema.index({ user: 1, date: -1 });
expenditureSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("Expenditure", expenditureSchema);
