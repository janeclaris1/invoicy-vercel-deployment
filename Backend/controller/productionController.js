const WorkOrder = require("../models/WorkOrder");
const BOM = require("../models/Bom");
const Resource = require("../models/Resource");
const ResourceAllocation = require("../models/ResourceAllocation");
const MaintenanceSchedule = require("../models/MaintenanceSchedule");
const MaintenanceLog = require("../models/MaintenanceLog");
const Item = require("../models/Item");
const User = require("../models/User");

const getTeamMemberIds = async (currentUserId) => {
  const currentUser = await User.findById(currentUserId);
  if (!currentUser) return [currentUserId];
  if (!currentUser.createdBy) return [currentUserId];
  const teamMembers = await User.find({
    $or: [{ createdBy: currentUser.createdBy }, { _id: currentUser.createdBy }],
  }).select("_id");
  return teamMembers.map((m) => m._id);
};

// -------- Work Orders --------
exports.getWorkOrders = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { status } = req.query;
    const filter = { user: { $in: teamMemberIds } };
    if (status) filter.status = status;
    const orders = await WorkOrder.find(filter).populate("product", "name sku unit").sort({ updatedAt: -1 }).lean();
    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get work orders" });
  }
};

exports.createWorkOrder = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { orderNumber, product, quantity, dueDate, startDate, status, branch, notes, lines } = req.body;
    if (!orderNumber || !product || quantity == null || quantity < 1) {
      return res.status(400).json({ message: "orderNumber, product, and quantity are required" });
    }
    const item = await Item.findOne({ _id: product, user: { $in: teamMemberIds } });
    if (!item) return res.status(400).json({ message: "Product item not found" });
    const existing = await WorkOrder.findOne({ user: req.user._id, orderNumber: String(orderNumber).trim() });
    if (existing) return res.status(400).json({ message: "Order number already exists" });
    const order = await WorkOrder.create({
      user: req.user._id,
      branch: branch || null,
      orderNumber: String(orderNumber).trim(),
      product: item._id,
      quantity: Number(quantity),
      dueDate: dueDate ? new Date(dueDate) : null,
      startDate: startDate ? new Date(startDate) : null,
      status: status || "draft",
      notes: String(notes || "").trim(),
      lines: Array.isArray(lines) ? lines : [],
    });
    const populated = await WorkOrder.findById(order._id).populate("product", "name sku unit").lean();
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create work order" });
  }
};

exports.getWorkOrderById = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const order = await WorkOrder.findOne({ _id: req.params.id, user: { $in: teamMemberIds } })
      .populate("product", "name sku unit")
      .populate("lines.item", "name sku unit")
      .lean();
    if (!order) return res.status(404).json({ message: "Work order not found" });
    return res.json(order);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get work order" });
  }
};

exports.updateWorkOrder = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const order = await WorkOrder.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!order) return res.status(404).json({ message: "Work order not found" });
    const { orderNumber, product, quantity, quantityProduced, dueDate, startDate, completedAt, status, branch, notes, lines } = req.body;
    if (orderNumber !== undefined) order.orderNumber = String(orderNumber).trim();
    if (product !== undefined) order.product = product;
    if (quantity !== undefined) order.quantity = Number(quantity);
    if (quantityProduced !== undefined) order.quantityProduced = Number(quantityProduced);
    if (dueDate !== undefined) order.dueDate = dueDate ? new Date(dueDate) : null;
    if (startDate !== undefined) order.startDate = startDate ? new Date(startDate) : null;
    if (completedAt !== undefined) order.completedAt = completedAt ? new Date(completedAt) : null;
    if (status !== undefined) order.status = status;
    if (branch !== undefined) order.branch = branch || null;
    if (notes !== undefined) order.notes = String(notes).trim();
    if (Array.isArray(lines)) order.lines = lines;
    if (status === "completed" && !order.completedAt) order.completedAt = new Date();
    await order.save();
    const populated = await WorkOrder.findById(order._id).populate("product", "name sku unit").populate("lines.item", "name sku unit").lean();
    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update work order" });
  }
};

exports.deleteWorkOrder = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const order = await WorkOrder.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!order) return res.status(404).json({ message: "Work order not found" });
    await ResourceAllocation.deleteMany({ workOrder: order._id });
    await WorkOrder.deleteOne({ _id: order._id });
    return res.json({ message: "Work order deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete work order" });
  }
};

// -------- BOM --------
exports.getBOMs = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { parentItem } = req.query;
    const filter = { user: { $in: teamMemberIds } };
    if (parentItem) filter.parentItem = parentItem;
    const boms = await BOM.find(filter)
      .populate("parentItem", "name sku unit")
      .populate("childItem", "name sku unit")
      .sort({ parentItem: 1 })
      .lean();
    return res.json(boms);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get BOMs" });
  }
};

exports.createBOM = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { parentItem, childItem, quantity, unit, notes } = req.body;
    if (!parentItem || !childItem || quantity == null) {
      return res.status(400).json({ message: "parentItem, childItem, and quantity are required" });
    }
    const [parent, child] = await Promise.all([
      Item.findOne({ _id: parentItem, user: { $in: teamMemberIds } }),
      Item.findOne({ _id: childItem, user: { $in: teamMemberIds } }),
    ]);
    if (!parent || !child) return res.status(400).json({ message: "Parent or child item not found" });
    const bom = await BOM.create({
      user: req.user._id,
      parentItem: parent._id,
      childItem: child._id,
      quantity: Number(quantity),
      unit: String(unit || "").trim(),
      notes: String(notes || "").trim(),
    });
    const populated = await BOM.findById(bom._id).populate("parentItem", "name sku unit").populate("childItem", "name sku unit").lean();
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create BOM" });
  }
};

exports.updateBOM = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const bom = await BOM.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!bom) return res.status(404).json({ message: "BOM not found" });
    const { quantity, unit, notes } = req.body;
    if (quantity !== undefined) bom.quantity = Number(quantity);
    if (unit !== undefined) bom.unit = String(unit).trim();
    if (notes !== undefined) bom.notes = String(notes).trim();
    await bom.save();
    const populated = await BOM.findById(bom._id).populate("parentItem", "name sku unit").populate("childItem", "name sku unit").lean();
    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update BOM" });
  }
};

exports.deleteBOM = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const bom = await BOM.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!bom) return res.status(404).json({ message: "BOM not found" });
    await BOM.deleteOne({ _id: bom._id });
    return res.json({ message: "BOM deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete BOM" });
  }
};

// BOM explosion: get all components for a parent (one level or recursive could be added later)
exports.getBOMByParent = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const boms = await BOM.find({ parentItem: req.params.parentId, user: { $in: teamMemberIds } })
      .populate("parentItem", "name sku unit")
      .populate("childItem", "name sku unit")
      .lean();
    return res.json(boms);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get BOM" });
  }
};

// -------- Resources --------
exports.getResources = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { type } = req.query;
    const filter = { user: { $in: teamMemberIds } };
    if (type) filter.type = type;
    const resources = await Resource.find(filter).sort({ name: 1 }).lean();
    return res.json(resources);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get resources" });
  }
};

exports.createResource = async (req, res) => {
  try {
    const { name, type, capacityPerDay, capacityUnit, branch, isActive, notes } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Name is required" });
    const resource = await Resource.create({
      user: req.user._id,
      name: String(name).trim(),
      type: type || "machine",
      capacityPerDay: capacityPerDay != null ? Number(capacityPerDay) : null,
      capacityUnit: capacityUnit || "hours",
      branch: branch || null,
      isActive: isActive !== false,
      notes: String(notes || "").trim(),
    });
    return res.status(201).json(resource);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create resource" });
  }
};

exports.updateResource = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const resource = await Resource.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!resource) return res.status(404).json({ message: "Resource not found" });
    const { name, type, capacityPerDay, capacityUnit, branch, isActive, notes } = req.body;
    if (name !== undefined) resource.name = String(name).trim();
    if (type !== undefined) resource.type = type;
    if (capacityPerDay !== undefined) resource.capacityPerDay = capacityPerDay != null ? Number(capacityPerDay) : null;
    if (capacityUnit !== undefined) resource.capacityUnit = capacityUnit;
    if (branch !== undefined) resource.branch = branch || null;
    if (isActive !== undefined) resource.isActive = !!isActive;
    if (notes !== undefined) resource.notes = String(notes).trim();
    await resource.save();
    return res.json(resource);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update resource" });
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const resource = await Resource.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!resource) return res.status(404).json({ message: "Resource not found" });
    await ResourceAllocation.deleteMany({ resource: resource._id });
    await MaintenanceSchedule.deleteMany({ resource: resource._id });
    await MaintenanceLog.deleteMany({ resource: resource._id });
    await Resource.deleteOne({ _id: resource._id });
    return res.json({ message: "Resource deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete resource" });
  }
};

// -------- Capacity & Allocation --------
exports.getCapacity = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { resourceId, from, to } = req.query;
    if (!resourceId || !from || !to) {
      return res.status(400).json({ message: "resourceId, from, and to are required" });
    }
    const resource = await Resource.findOne({ _id: resourceId, user: { $in: teamMemberIds } }).lean();
    if (!resource) return res.status(404).json({ message: "Resource not found" });
    const start = new Date(from);
    const end = new Date(to);
    const allocations = await ResourceAllocation.find({
      resource: resource._id,
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    })
      .populate("workOrder", "orderNumber product quantity status")
      .lean();
    const capacityPerDay = resource.capacityPerDay || 0;
    return res.json({
      resource: { _id: resource._id, name: resource.name, type: resource.type, capacityPerDay, capacityUnit: resource.capacityUnit },
      from: start,
      to: end,
      allocations,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get capacity" });
  }
};

exports.createAllocation = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { resourceId, workOrderId, startDate, endDate, allocatedUnits, unit, notes } = req.body;
    if (!resourceId || !workOrderId || !startDate || !endDate || allocatedUnits == null) {
      return res.status(400).json({ message: "resourceId, workOrderId, startDate, endDate, and allocatedUnits are required" });
    }
    const [resource, workOrder] = await Promise.all([
      Resource.findOne({ _id: resourceId, user: { $in: teamMemberIds } }),
      WorkOrder.findOne({ _id: workOrderId, user: { $in: teamMemberIds } }),
    ]);
    if (!resource) return res.status(404).json({ message: "Resource not found" });
    if (!workOrder) return res.status(404).json({ message: "Work order not found" });
    const allocation = await ResourceAllocation.create({
      user: req.user._id,
      resource: resource._id,
      workOrder: workOrder._id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      allocatedUnits: Number(allocatedUnits),
      unit: unit || "hours",
      notes: String(notes || "").trim(),
    });
    const populated = await ResourceAllocation.findById(allocation._id)
      .populate("resource", "name type capacityPerDay")
      .populate("workOrder", "orderNumber product quantity status")
      .lean();
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create allocation" });
  }
};

exports.getAllocations = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { resourceId, workOrderId } = req.query;
    const filter = { user: { $in: teamMemberIds } };
    if (resourceId) filter.resource = resourceId;
    if (workOrderId) filter.workOrder = workOrderId;
    const allocations = await ResourceAllocation.find(filter)
      .populate("resource", "name type capacityPerDay")
      .populate("workOrder", "orderNumber product quantity status")
      .sort({ startDate: 1 })
      .lean();
    return res.json(allocations);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get allocations" });
  }
};

exports.deleteAllocation = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const allocation = await ResourceAllocation.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!allocation) return res.status(404).json({ message: "Allocation not found" });
    await ResourceAllocation.deleteOne({ _id: allocation._id });
    return res.json({ message: "Allocation deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete allocation" });
  }
};

// -------- Maintenance Schedules --------
exports.getMaintenanceSchedules = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { resourceId } = req.query;
    const filter = { user: { $in: teamMemberIds } };
    if (resourceId) filter.resource = resourceId;
    const schedules = await MaintenanceSchedule.find(filter)
      .populate("resource", "name type")
      .sort({ nextDueAt: 1 })
      .lean();
    return res.json(schedules);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get maintenance schedules" });
  }
};

exports.createMaintenanceSchedule = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { resourceId, frequency, description, nextDueAt } = req.body;
    if (!resourceId || !frequency) return res.status(400).json({ message: "resourceId and frequency are required" });
    const resource = await Resource.findOne({ _id: resourceId, user: { $in: teamMemberIds } });
    if (!resource) return res.status(404).json({ message: "Resource not found" });
    const schedule = await MaintenanceSchedule.create({
      user: req.user._id,
      resource: resource._id,
      frequency,
      description: String(description || "").trim(),
      nextDueAt: nextDueAt ? new Date(nextDueAt) : null,
    });
    const populated = await MaintenanceSchedule.findById(schedule._id).populate("resource", "name type").lean();
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create maintenance schedule" });
  }
};

exports.updateMaintenanceSchedule = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const schedule = await MaintenanceSchedule.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!schedule) return res.status(404).json({ message: "Maintenance schedule not found" });
    const { frequency, description, lastDoneAt, nextDueAt, isActive } = req.body;
    if (frequency !== undefined) schedule.frequency = frequency;
    if (description !== undefined) schedule.description = String(description).trim();
    if (lastDoneAt !== undefined) schedule.lastDoneAt = lastDoneAt ? new Date(lastDoneAt) : null;
    if (nextDueAt !== undefined) schedule.nextDueAt = nextDueAt ? new Date(nextDueAt) : null;
    if (isActive !== undefined) schedule.isActive = !!isActive;
    await schedule.save();
    const populated = await MaintenanceSchedule.findById(schedule._id).populate("resource", "name type").lean();
    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update maintenance schedule" });
  }
};

exports.deleteMaintenanceSchedule = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const schedule = await MaintenanceSchedule.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!schedule) return res.status(404).json({ message: "Maintenance schedule not found" });
    await MaintenanceSchedule.deleteOne({ _id: schedule._id });
    return res.json({ message: "Maintenance schedule deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete maintenance schedule" });
  }
};

// -------- Maintenance Logs --------
exports.getMaintenanceLogs = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { resourceId } = req.query;
    const filter = { user: { $in: teamMemberIds } };
    if (resourceId) filter.resource = resourceId;
    const logs = await MaintenanceLog.find(filter)
      .populate("resource", "name type")
      .sort({ performedAt: -1 })
      .lean();
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get maintenance logs" });
  }
};

exports.createMaintenanceLog = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { resourceId, scheduleId, performedAt, description, performedBy, outcome } = req.body;
    if (!resourceId || !performedAt) return res.status(400).json({ message: "resourceId and performedAt are required" });
    const resource = await Resource.findOne({ _id: resourceId, user: { $in: teamMemberIds } });
    if (!resource) return res.status(404).json({ message: "Resource not found" });
    const log = await MaintenanceLog.create({
      user: req.user._id,
      resource: resource._id,
      schedule: scheduleId || null,
      performedAt: new Date(performedAt),
      description: String(description || "").trim(),
      performedBy: String(performedBy || "").trim(),
      outcome: outcome || "ok",
    });
    if (scheduleId) {
      await MaintenanceSchedule.updateOne(
        { _id: scheduleId, user: { $in: teamMemberIds } },
        { $set: { lastDoneAt: new Date(performedAt) } }
      );
    }
    const populated = await MaintenanceLog.findById(log._id).populate("resource", "name type").lean();
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create maintenance log" });
  }
};
