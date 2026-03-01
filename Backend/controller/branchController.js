const Branch = require("../models/Branch");
const Invoice = require("../models/invoice");
const Employee = require("../models/Employee");
const User = require("../models/User");

const getOwnerId = (user) => (user && user.createdBy) ? user.createdBy : (user && user._id) ? user._id : null;

exports.getBranches = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    if (!ownerId) return res.json([]);
    const branches = await Branch.find({ user: ownerId }).sort({ isDefault: -1, createdAt: 1 }).lean();
    return res.json(branches);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get branches" });
  }
};

exports.getBranchById = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const branch = await Branch.findOne({ _id: req.params.id, user: ownerId }).lean();
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    return res.json(branch);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get branch" });
  }
};

exports.getBranchDashboard = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const branches = await Branch.find({ user: ownerId, status: "active" }).sort({ name: 1 }).lean();
    const branchIds = branches.map((b) => b._id);
    const [invoiceCounts, employeeCounts] = await Promise.all([
      Invoice.aggregate([{ $match: { branch: { $in: branchIds } } }, { $group: { _id: "$branch", count: { $sum: 1 } } }]),
      Employee.aggregate([{ $match: { branch: { $in: branchIds } } }, { $group: { _id: "$branch", count: { $sum: 1 } } }]),
    ]);
    const invMap = {};
    invoiceCounts.forEach((x) => { invMap[x._id ? x._id.toString() : ""] = x.count; });
    const empMap = {};
    employeeCounts.forEach((x) => { empMap[x._id ? x._id.toString() : ""] = x.count; });
    const result = branches.map((b) => ({
      ...b,
      invoiceCount: invMap[b._id.toString()] || 0,
      employeeCount: empMap[b._id.toString()] || 0,
    }));
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get branch dashboard" });
  }
};

exports.createBranch = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    if (!ownerId) return res.status(403).json({ message: "Only account owner can create branches" });
    const { name, address, phone, email, tin, isDefault, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Branch name is required" });
    }
    const branch = await Branch.create({
      user: ownerId,
      name: String(name).trim(),
      address: String(address || "").trim(),
      phone: String(phone || "").trim(),
      email: String(email || "").trim().toLowerCase(),
      tin: String(tin || "").trim(),
      isDefault: !!isDefault,
      status: status === "inactive" ? "inactive" : "active",
    });
    if (branch.isDefault) {
      await Branch.updateMany({ user: ownerId, _id: { $ne: branch._id } }, { $set: { isDefault: false } });
    }
    return res.status(201).json(branch);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create branch" });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const branch = await Branch.findOne({ _id: req.params.id, user: ownerId });
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    const { name, address, phone, email, tin, isDefault, status } = req.body;
    if (name !== undefined) branch.name = String(name).trim();
    if (address !== undefined) branch.address = String(address).trim();
    if (phone !== undefined) branch.phone = String(phone).trim();
    if (email !== undefined) branch.email = String(email).trim().toLowerCase();
    if (tin !== undefined) branch.tin = String(tin).trim();
    if (status !== undefined && ["active", "inactive"].includes(status)) branch.status = status;
    if (isDefault !== undefined) {
      branch.isDefault = !!isDefault;
      if (branch.isDefault) {
        await Branch.updateMany({ user: branch.user, _id: { $ne: branch._id } }, { $set: { isDefault: false } });
      }
    }
    await branch.save();
    return res.json(branch);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update branch" });
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const branch = await Branch.findOne({ _id: req.params.id, user: ownerId });
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    await Employee.updateMany({ branch: branch._id }, { $set: { branch: null } });
    await branch.deleteOne();
    return res.json({ message: "Branch deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete branch" });
  }
};

exports.getBranchEmployees = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const branch = await Branch.findOne({ _id: req.params.id, user: ownerId });
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    const employees = await Employee.find({ branch: branch._id })
      .populate("branch", "name")
      .sort({ lastName: 1, firstName: 1 })
      .lean();
    return res.json(employees);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get branch employees" });
  }
};
