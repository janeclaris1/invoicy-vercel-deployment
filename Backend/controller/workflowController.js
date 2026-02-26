const Workflow = require("../models/Workflow");
const logger = require("../utils/logger");

const getWorkflows = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const workflows = await Workflow.find({ user: userId }).sort({ createdAt: -1 }).lean();
    res.json(workflows);
  } catch (error) {
    logger.error("Get workflows error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getWorkflowById = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const workflow = await Workflow.findOne({ _id: req.params.id, user: userId }).lean();
    if (!workflow) return res.status(404).json({ message: "Workflow not found" });
    res.json(workflow);
  } catch (error) {
    logger.error("Get workflow error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createWorkflow = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, triggerType, triggerConfig, actions, isActive } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Workflow name is required" });
    const workflow = await Workflow.create({
      user: userId,
      name: name.trim(),
      triggerType: triggerType || "manual",
      triggerConfig: triggerConfig || {},
      actions: Array.isArray(actions) ? actions : [],
      isActive: isActive !== false,
    });
    res.status(201).json(workflow);
  } catch (error) {
    logger.error("Create workflow error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateWorkflow = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const workflow = await Workflow.findOne({ _id: req.params.id, user: userId });
    if (!workflow) return res.status(404).json({ message: "Workflow not found" });
    const { name, triggerType, triggerConfig, actions, isActive } = req.body;
    if (name !== undefined) workflow.name = name.trim();
    if (triggerType !== undefined) workflow.triggerType = triggerType;
    if (triggerConfig !== undefined) workflow.triggerConfig = triggerConfig;
    if (actions !== undefined && Array.isArray(actions)) workflow.actions = actions;
    if (typeof isActive === "boolean") workflow.isActive = isActive;
    await workflow.save();
    res.json(workflow);
  } catch (error) {
    logger.error("Update workflow error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteWorkflow = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const workflow = await Workflow.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!workflow) return res.status(404).json({ message: "Workflow not found" });
    res.json({ message: "Workflow deleted" });
  } catch (error) {
    logger.error("Delete workflow error", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
};
