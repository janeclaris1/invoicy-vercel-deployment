const Lead = require("../models/Lead");
const logger = require("../utils/logger");

const getLeads = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { status } = req.query;
    const filter = { user: userId };
    if (status) filter.status = status;
    const leads = await Lead.find(filter).populate("contact", "firstName lastName email").populate("company", "name").sort({ createdAt: -1 }).lean();
    res.json(leads);
  } catch (error) {
    logger.error("Get leads error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getLeadById = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const lead = await Lead.findOne({ _id: req.params.id, user: userId }).populate("contact").populate("company").lean();
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json(lead);
  } catch (error) {
    logger.error("Get lead error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createLead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { contact, company, name, email, phone, status, score, source, campaignId, notes } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Lead name is required" });
    const lead = await Lead.create({
      user: userId,
      contact: contact || null,
      company: company || null,
      name: (name || "").trim(),
      email: (email || "").trim(),
      phone: (phone || "").trim(),
      status: status || "new",
      score: typeof score === "number" ? score : 0,
      source: (source || "").trim(),
      campaignId: campaignId || null,
      notes: notes || "",
    });
    res.status(201).json(lead);
  } catch (error) {
    logger.error("Create lead error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateLead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const lead = await Lead.findOne({ _id: req.params.id, user: userId });
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    const { contact, company, name, email, phone, status, score, source, campaignId, notes } = req.body;
    if (contact !== undefined) lead.contact = contact || null;
    if (company !== undefined) lead.company = company || null;
    if (name !== undefined) lead.name = (name || "").trim();
    if (email !== undefined) lead.email = (email || "").trim();
    if (phone !== undefined) lead.phone = (phone || "").trim();
    if (status !== undefined) lead.status = status;
    if (typeof score === "number") lead.score = score;
    if (source !== undefined) lead.source = (source || "").trim();
    if (campaignId !== undefined) lead.campaignId = campaignId || null;
    if (notes !== undefined) lead.notes = notes || "";
    await lead.save();
    res.json(lead);
  } catch (error) {
    logger.error("Update lead error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteLead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json({ message: "Lead deleted" });
  } catch (error) {
    logger.error("Delete lead error", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getLeads, getLeadById, createLead, updateLead, deleteLead };
