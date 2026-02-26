const Campaign = require("../models/Campaign");
const logger = require("../utils/logger");

const getCampaigns = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const campaigns = await Campaign.find({ user: userId }).sort({ createdAt: -1 }).lean();
    res.json(campaigns);
  } catch (error) {
    logger.error("Get campaigns error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getCampaignById = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const campaign = await Campaign.findOne({ _id: req.params.id, user: userId }).lean();
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    res.json(campaign);
  } catch (error) {
    logger.error("Get campaign error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createCampaign = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, type, subject, body, targetSegment, listId, templateId, scheduledAt } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Campaign name is required" });
    const campaign = await Campaign.create({
      user: userId,
      name: name.trim(),
      type: type || "email",
      subject: subject || "",
      body: body || "",
      targetSegment: targetSegment || "all",
      listId: listId || null,
      templateId: templateId || null,
      scheduledAt: scheduledAt || null,
    });
    res.status(201).json(campaign);
  } catch (error) {
    logger.error("Create campaign error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateCampaign = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const campaign = await Campaign.findOne({ _id: req.params.id, user: userId });
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    const { name, type, subject, body, targetSegment, listId, templateId, scheduledAt, status } = req.body;
    if (name !== undefined) campaign.name = name.trim();
    if (type !== undefined) campaign.type = type;
    if (subject !== undefined) campaign.subject = subject;
    if (body !== undefined) campaign.body = body;
    if (targetSegment !== undefined) campaign.targetSegment = targetSegment;
    if (listId !== undefined) campaign.listId = listId;
    if (templateId !== undefined) campaign.templateId = templateId;
    if (scheduledAt !== undefined) campaign.scheduledAt = scheduledAt;
    if (status !== undefined && ["draft", "scheduled", "cancelled"].includes(status)) campaign.status = status;
    await campaign.save();
    res.json(campaign);
  } catch (error) {
    logger.error("Update campaign error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteCampaign = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const campaign = await Campaign.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    res.json({ message: "Campaign deleted" });
  } catch (error) {
    logger.error("Delete campaign error", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
};
