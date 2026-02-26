const MarketingList = require("../models/MarketingList");
const logger = require("../utils/logger");

const getLists = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const lists = await MarketingList.find({ user: userId }).sort({ createdAt: -1 }).lean();
    res.json(lists);
  } catch (error) {
    logger.error("Get marketing lists error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getListById = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const list = await MarketingList.findOne({ _id: req.params.id, user: userId }).lean();
    if (!list) return res.status(404).json({ message: "List not found" });
    res.json(list);
  } catch (error) {
    logger.error("Get list error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createList = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, type, description, conditions } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "List name is required" });
    const list = await MarketingList.create({
      user: userId,
      name: name.trim(),
      type: type || "static",
      description: description || "",
      conditions: conditions || {},
    });
    res.status(201).json(list);
  } catch (error) {
    logger.error("Create list error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateList = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const list = await MarketingList.findOne({ _id: req.params.id, user: userId });
    if (!list) return res.status(404).json({ message: "List not found" });
    const { name, type, description, conditions, contactCount } = req.body;
    if (name !== undefined) list.name = name.trim();
    if (type !== undefined) list.type = type;
    if (description !== undefined) list.description = description;
    if (conditions !== undefined) list.conditions = conditions;
    if (typeof contactCount === "number") list.contactCount = contactCount;
    await list.save();
    res.json(list);
  } catch (error) {
    logger.error("Update list error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteList = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const list = await MarketingList.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!list) return res.status(404).json({ message: "List not found" });
    res.json({ message: "List deleted" });
  } catch (error) {
    logger.error("Delete list error", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getLists, getListById, createList, updateList, deleteList };
