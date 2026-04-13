const Customer = require("../models/Customer");
const User = require("../models/User");
const logger = require("../utils/logger");

const getTeamMemberIds = async (currentUserId) => {
  try {
    if (!currentUserId) return [];
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) return [currentUserId];
    if (!currentUser.createdBy) return [currentUserId];

    const teamMembers = await User.find({
      $or: [{ createdBy: currentUser.createdBy }, { _id: currentUser.createdBy }],
    }).select("_id");

    const ids = teamMembers.map((member) => member._id);
    return ids.length > 0 ? ids : [currentUserId];
  } catch (error) {
    logger.error("Get team member IDs error", error);
    return [currentUserId];
  }
};

const getCustomers = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const teamMemberIds = await getTeamMemberIds(userId);
    const customers = await Customer.find({ user: { $in: teamMemberIds } }).sort({ createdAt: -1 }).lean();
    return res.json(Array.isArray(customers) ? customers : []);
  } catch (error) {
    logger.error("Get customers error", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const teamMemberIds = await getTeamMemberIds(userId);
    const customer = await Customer.findOne({ _id: req.params.id, user: { $in: teamMemberIds } }).lean();
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    return res.json(customer);
  } catch (error) {
    logger.error("Get customer by id error", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const createCustomer = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { name, email, phone, company, address, city, country, taxId, currency } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Customer name is required" });
    }

    const customer = await Customer.create({
      user: userId,
      name: String(name).trim(),
      email: String(email || "").trim(),
      phone: String(phone || "").trim(),
      company: String(company || "").trim(),
      address: String(address || "").trim(),
      city: String(city || "").trim(),
      country: String(country || "").trim(),
      taxId: String(taxId || "").trim(),
      currency: String(currency || "GHS").trim() || "GHS",
    });

    return res.status(201).json(customer);
  } catch (error) {
    logger.error("Create customer error", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const teamMemberIds = await getTeamMemberIds(userId);
    const customer = await Customer.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const editableFields = ["name", "email", "phone", "company", "address", "city", "country", "taxId", "currency"];
    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        customer[field] = String(req.body[field] || "").trim();
      }
    });

    if (!customer.name) {
      return res.status(400).json({ message: "Customer name is required" });
    }

    await customer.save();
    return res.json(customer);
  } catch (error) {
    logger.error("Update customer error", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const teamMemberIds = await getTeamMemberIds(userId);

    const customer = await Customer.findOneAndDelete({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    return res.json({ message: "Customer deleted" });
  } catch (error) {
    logger.error("Delete customer error", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer };
