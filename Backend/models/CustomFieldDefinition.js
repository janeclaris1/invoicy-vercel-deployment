const mongoose = require("mongoose");

const customFieldDefinitionSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    fieldType: { type: String, enum: ["string", "number", "date", "boolean", "json"], default: "string" },
    required: { type: Boolean, default: false },
    defaultValue: { type: mongoose.Schema.Types.Mixed },
    options: { type: mongoose.Schema.Types.Mixed },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

customFieldDefinitionSchema.index({ entityType: 1, code: 1 }, { unique: true });

module.exports = mongoose.model("CustomFieldDefinition", customFieldDefinitionSchema);
