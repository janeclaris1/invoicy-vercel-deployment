const SectionNote = require("../models/SectionNote");

const getOwnerId = (user) => (user && user.createdBy) ? user.createdBy : (user && user._id) ? user._id : null;

exports.getNotes = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const section = req.query.section;
    if (!section || !["projects", "production", "supply_chain"].includes(section)) {
      return res.status(400).json({ message: "Valid section (projects|production|supply_chain) is required" });
    }
    const notes = await SectionNote.find({ user: ownerId, section })
      .sort({ updatedAt: -1 })
      .lean();
    return res.json(notes);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get notes" });
  }
};

exports.createNote = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const { section, entityId, title, body } = req.body;
    if (!section || !["projects", "production", "supply_chain"].includes(section)) {
      return res.status(400).json({ message: "Valid section (projects|production|supply_chain) is required" });
    }
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    const note = await SectionNote.create({
      user: ownerId,
      section,
      entityId: entityId || undefined,
      title: String(title).trim(),
      body: body != null ? String(body) : "",
    });
    return res.status(201).json(note);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create note" });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const note = await SectionNote.findOne({ _id: req.params.id, user: ownerId });
    if (!note) return res.status(404).json({ message: "Note not found" });
    const { title, body } = req.body;
    if (title !== undefined) note.title = String(title).trim();
    if (body !== undefined) note.body = String(body);
    await note.save();
    return res.json(note);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update note" });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const note = await SectionNote.findOneAndDelete({ _id: req.params.id, user: ownerId });
    if (!note) return res.status(404).json({ message: "Note not found" });
    return res.json({ message: "Note deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete note" });
  }
};
