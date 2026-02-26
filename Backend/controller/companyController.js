const Company = require("../models/Company");
const logger = require("../utils/logger");

const getCompanies = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const companies = await Company.find({ user: userId }).sort({ createdAt: -1 }).lean();
    res.json(companies);
  } catch (error) {
    logger.error("Get companies error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getCompanyById = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const company = await Company.findOne({ _id: req.params.id, user: userId }).lean();
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.json(company);
  } catch (error) {
    logger.error("Get company error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createCompany = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, website, phone, address, industry, notes } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Company name is required" });
    const company = await Company.create({
      user: userId,
      name: (name || "").trim(),
      website: (website || "").trim(),
      phone: (phone || "").trim(),
      address: (address || "").trim(),
      industry: (industry || "").trim(),
      notes: notes || "",
    });
    res.status(201).json(company);
  } catch (error) {
    logger.error("Create company error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateCompany = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const company = await Company.findOne({ _id: req.params.id, user: userId });
    if (!company) return res.status(404).json({ message: "Company not found" });
    const { name, website, phone, address, industry, notes } = req.body;
    if (name !== undefined) company.name = (name || "").trim();
    if (website !== undefined) company.website = (website || "").trim();
    if (phone !== undefined) company.phone = (phone || "").trim();
    if (address !== undefined) company.address = (address || "").trim();
    if (industry !== undefined) company.industry = (industry || "").trim();
    if (notes !== undefined) company.notes = notes || "";
    await company.save();
    res.json(company);
  } catch (error) {
    logger.error("Update company error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteCompany = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const company = await Company.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.json({ message: "Company deleted" });
  } catch (error) {
    logger.error("Delete company error", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany };
