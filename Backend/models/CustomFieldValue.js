/**
 * CustomFieldValue — stores custom field values per entity instance.
 * One document per entity (entityType + entityId); values stored as key-value in "values" map.
 */
const mongoose = require("mongoose");

const customFieldValueSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true, trim: true },
    entityId: { type: mongoose.Schema.Types.Mixed, required: true },
    values: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

customFieldValueSchema.index({ entityType: 1, entityId: 1 }, { unique: true });

module.exports = mongoose.model("CustomFieldValue", customFieldValueSchema);
