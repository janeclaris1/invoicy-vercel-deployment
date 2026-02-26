const Deal = require("../models/Deal");
const logger = require("../utils/logger");

const getDeals = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { stage } = req.query;
    const filter = { user: userId };
    if (stage) filter.stage = stage;
    const deals = await Deal.find(filter).populate("contact", "firstName lastName email").populate("lead", "name email").populate("company", "name").sort({ createdAt: -1 }).lean();
    res.json(deals);
  } catch (error) {
    logger.error("Get deals error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getDealById = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const deal = await Deal.findOne({ _id: req.params.id, user: userId }).populate("contact").populate("lead").populate("company").lean();
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json(deal);
  } catch (error) {
    logger.error("Get deal error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createDeal = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { contact, lead, company, name, value, currency, stage, expectedCloseDate, notes } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Deal name is required" });
    const deal = await Deal.create({
      user: userId,
      contact: contact || null,
      lead: lead || null,
      company: company || null,
      name: (name || "").trim(),
      value: typeof value === "number" ? value : 0,
      currency: (currency || "GHS").trim(),
      stage: stage || "qualification",
      expectedCloseDate: expectedCloseDate || null,
      notes: notes || "",
    });
    res.status(201).json(deal);
  } catch (error) {
    logger.error("Create deal error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateDeal = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const deal = await Deal.findOne({ _id: req.params.id, user: userId });
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    const { contact, lead, company, name, value, currency, stage, expectedCloseDate, notes } = req.body;
    if (contact !== undefined) deal.contact = contact || null;
    if (lead !== undefined) deal.lead = lead || null;
    if (company !== undefined) deal.company = company || null;
    if (name !== undefined) deal.name = (name || "").trim();
    if (typeof value === "number") deal.value = value;
    if (currency !== undefined) deal.currency = (currency || "GHS").trim();
    if (stage !== undefined) deal.stage = stage;
    if (expectedCloseDate !== undefined) deal.expectedCloseDate = expectedCloseDate || null;
    if (notes !== undefined) deal.notes = notes || "";
    await deal.save();
    res.json(deal);
  } catch (error) {
    logger.error("Update deal error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteDeal = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const deal = await Deal.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json({ message: "Deal deleted" });
  } catch (error) {
    logger.error("Delete deal error", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getDeals, getDealById, createDeal, updateDeal, deleteDeal };
