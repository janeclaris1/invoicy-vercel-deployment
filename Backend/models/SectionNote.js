const mongoose = require("mongoose");

const sectionNoteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    section: { type: String, enum: ["projects", "production", "supply_chain"], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
  },
  { timestamps: true }
);

sectionNoteSchema.index({ user: 1, section: 1 });
sectionNoteSchema.index({ user: 1, section: 1, createdAt: -1 });

module.exports = mongoose.model("SectionNote", sectionNoteSchema);
