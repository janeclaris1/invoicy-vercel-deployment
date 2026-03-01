const mongoose = require("mongoose");

const journalEntryLineSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    accountCode: { type: String, required: true },
    accountName: { type: String, required: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    memo: { type: String, default: "" },
  },
  { _id: false }
);

const journalEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    entryNumber: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    lines: [journalEntryLineSchema],
    totalDebit: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "posted"],
      default: "draft",
    },
  },
  { timestamps: true }
);

journalEntrySchema.index({ user: 1, entryNumber: 1 }, { unique: true });
journalEntrySchema.index({ user: 1, date: 1, status: 1 });

module.exports = mongoose.model("JournalEntry", journalEntrySchema);
