/**
 * Document API — list/upload/get/delete documents linked to entities.
 */
const Document = require("../models/Document");

const list = async (req, res) => {
  try {
    const userId = req.user._id;
    const { entityType, entityId } = req.query;
    const filter = { user: userId };
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    const docs = await Document.find(filter)
      .select("name entityType entityId mimeType size createdAt uploadedBy")
      .sort({ createdAt: -1 })
      .lean();
    return res.json(docs);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to list documents" });
  }
};

const upload = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, entityType, entityId, mimeType, content } = req.body;
    if (!name || !entityType || !entityId) {
      return res.status(400).json({ message: "name, entityType, and entityId are required" });
    }
    const size = (content && typeof content === "string") ? Buffer.byteLength(content, "utf8") : 0;
    const doc = await Document.create({
      user: userId,
      name: String(name).trim(),
      entityType: String(entityType).trim(),
      entityId: String(entityId).trim(),
      mimeType: mimeType || "application/octet-stream",
      size,
      content: content || "",
      uploadedBy: userId,
    });
    return res.status(201).json({
      _id: doc._id,
      name: doc.name,
      entityType: doc.entityType,
      entityId: doc.entityId,
      mimeType: doc.mimeType,
      size: doc.size,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to upload document" });
  }
};

const getById = async (req, res) => {
  try {
    const userId = req.user._id;
    const doc = await Document.findOne({ _id: req.params.id, user: userId }).lean();
    if (!doc) return res.status(404).json({ message: "Document not found" });
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get document" });
  }
};

const remove = async (req, res) => {
  try {
    const userId = req.user._id;
    const doc = await Document.findOne({ _id: req.params.id, user: userId });
    if (!doc) return res.status(404).json({ message: "Document not found" });
    await Document.deleteOne({ _id: doc._id });
    return res.json({ message: "Document deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete document" });
  }
};

module.exports = { list, upload, getById, remove };
