const Activity = require("../models/Activity");
const logger = require("../utils/logger");

const getActivities = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { contactId, leadId, dealId } = req.query;
    const filter = { user: userId };
    if (contactId) filter.contact = contactId;
    if (leadId) filter.lead = leadId;
    if (dealId) filter.deal = dealId;
    const activities = await Activity.find(filter)
      .populate("contact", "firstName lastName email")
      .populate("lead", "name email")
      .populate("deal", "name value stage")
      .sort({ createdAt: -1 })
      .lean();
    res.json(activities);
  } catch (error) {
    logger.error("Get activities error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getActivityById = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const activity = await Activity.findOne({ _id: req.params.id, user: userId }).lean();
    if (!activity) return res.status(404).json({ message: "Activity not found" });
    res.json(activity);
  } catch (error) {
    logger.error("Get activity error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createActivity = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { contact, lead, deal, type, title, description, dueDate, endDate, location } = req.body;
    if (!type) return res.status(400).json({ message: "Activity type is required" });
    const activity = await Activity.create({
      user: userId,
      contact: contact || null,
      lead: lead || null,
      deal: deal || null,
      type,
      title: (title || "").trim(),
      description: description || "",
      dueDate: dueDate || null,
      endDate: endDate || null,
      location: (location || "").trim(),
    });
    res.status(201).json(activity);
  } catch (error) {
    logger.error("Create activity error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateActivity = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const activity = await Activity.findOne({ _id: req.params.id, user: userId });
    if (!activity) return res.status(404).json({ message: "Activity not found" });
    const { contact, lead, deal, type, title, description, dueDate, endDate, location, completedAt } = req.body;
    if (contact !== undefined) activity.contact = contact || null;
    if (lead !== undefined) activity.lead = lead || null;
    if (deal !== undefined) activity.deal = deal || null;
    if (type !== undefined) activity.type = type;
    if (title !== undefined) activity.title = (title || "").trim();
    if (description !== undefined) activity.description = description || "";
    if (dueDate !== undefined) activity.dueDate = dueDate || null;
    if (endDate !== undefined) activity.endDate = endDate || null;
    if (location !== undefined) activity.location = (location || "").trim();
    if (completedAt !== undefined) activity.completedAt = completedAt || null;
    await activity.save();
    res.json(activity);
  } catch (error) {
    logger.error("Update activity error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteActivity = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const activity = await Activity.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!activity) return res.status(404).json({ message: "Activity not found" });
    res.json({ message: "Activity deleted" });
  } catch (error) {
    logger.error("Delete activity error", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getActivities, getActivityById, createActivity, updateActivity, deleteActivity };
