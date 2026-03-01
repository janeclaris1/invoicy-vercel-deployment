/**
 * Custom fields API — define fields per entity type; get/set values per entity.
 * Extensibility hook for ERP customizations.
 */
const CustomFieldDefinition = require("../models/CustomFieldDefinition");
const CustomFieldValue = require("../models/CustomFieldValue");

const listDefinitions = async (req, res) => {
  try {
    const { entityType } = req.query;
    const filter = entityType ? { entityType } : {};
    const defs = await CustomFieldDefinition.find(filter).sort({ entityType: 1, code: 1 }).lean();
    return res.json(defs);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to list custom field definitions" });
  }
};

const createDefinition = async (req, res) => {
  try {
    const { entityType, name, code, fieldType, required, defaultValue, options } = req.body;
    if (!entityType || !name || !code) {
      return res.status(400).json({ message: "entityType, name, and code are required" });
    }
    const existing = await CustomFieldDefinition.findOne({ entityType, code });
    if (existing) return res.status(400).json({ message: "Custom field code already exists for this entity type" });
    const def = await CustomFieldDefinition.create({
      entityType: entityType.trim(),
      name: name.trim(),
      code: code.trim(),
      fieldType: fieldType || "string",
      required: !!required,
      defaultValue,
      options: options || null,
      createdBy: req.user._id,
    });
    return res.status(201).json(def);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create custom field definition" });
  }
};

const getValues = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const doc = await CustomFieldValue.findOne({ entityType, entityId }).lean();
    return res.json({ values: (doc && doc.values) || {} });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get custom field values" });
  }
};

const setValues = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { values } = req.body;
    if (!values || typeof values !== "object") {
      return res.status(400).json({ message: "values object is required" });
    }
    const doc = await CustomFieldValue.findOneAndUpdate(
      { entityType, entityId },
      { $set: { values } },
      { new: true, upsert: true }
    );
    return res.json({ values: doc.values });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to set custom field values" });
  }
};

module.exports = {
  listDefinitions,
  createDefinition,
  getValues,
  setValues,
};
