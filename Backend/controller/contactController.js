const Contact = require("../models/Contact");
const logger = require("../utils/logger");

const getContacts = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { company } = req.query;
    const filter = { user: userId };
    if (company && String(company).trim()) filter.company = company.trim();
    const contacts = await Contact.find(filter).populate("company", "name").sort({ createdAt: -1 }).lean();
    res.json(Array.isArray(contacts) ? contacts : []);
  } catch (error) {
    logger.error("Get contacts error", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

const getContactById = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const contact = await Contact.findOne({ _id: req.params.id, user: userId }).populate("company").lean();
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json(contact);
  } catch (error) {
    logger.error("Get contact error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createContact = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { company, firstName, lastName, email, phone, jobTitle, source, tags, notes } = req.body;
    if (!firstName || !firstName.trim()) return res.status(400).json({ message: "First name is required" });
    const contact = await Contact.create({
      user: userId,
      company: company || null,
      firstName: (firstName || "").trim(),
      lastName: (lastName || "").trim(),
      email: (email || "").trim(),
      phone: (phone || "").trim(),
      jobTitle: (jobTitle || "").trim(),
      source: (source || "").trim(),
      tags: Array.isArray(tags) ? tags : [],
      notes: notes || "",
    });
    res.status(201).json(contact);
  } catch (error) {
    logger.error("Create contact error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateContact = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const contact = await Contact.findOne({ _id: req.params.id, user: userId });
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    const { company, firstName, lastName, email, phone, jobTitle, source, tags, notes } = req.body;
    if (firstName !== undefined) contact.firstName = (firstName || "").trim();
    if (lastName !== undefined) contact.lastName = (lastName || "").trim();
    if (email !== undefined) contact.email = (email || "").trim();
    if (phone !== undefined) contact.phone = (phone || "").trim();
    if (jobTitle !== undefined) contact.jobTitle = (jobTitle || "").trim();
    if (source !== undefined) contact.source = (source || "").trim();
    if (company !== undefined) contact.company = company || null;
    if (Array.isArray(tags)) contact.tags = tags;
    if (notes !== undefined) contact.notes = notes || "";
    await contact.save();
    res.json(contact);
  } catch (error) {
    logger.error("Update contact error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteContact = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const contact = await Contact.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json({ message: "Contact deleted" });
  } catch (error) {
    logger.error("Delete contact error", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getContacts, getContactById, createContact, updateContact, deleteContact };
