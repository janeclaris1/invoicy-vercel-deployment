const Supplier = require("../models/Supplier");
const PurchaseOrder = require("../models/PurchaseOrder");
const Warehouse = require("../models/Warehouse");
const StockLevel = require("../models/StockLevel");
const StockMovement = require("../models/StockMovement");
const Forecast = require("../models/Forecast");
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

// -------- Suppliers --------
exports.getSuppliers = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const suppliers = await Supplier.find({ user: { $in: teamMemberIds } }).sort({ name: 1 }).lean();
    return res.json(suppliers);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get suppliers" });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const { name, email, phone, company, address, city, country, taxId, category, notes, isActive } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Name is required" });
    const supplier = await Supplier.create({
      user: req.user._id,
      name: String(name).trim(),
      email: String(email || "").trim(),
      phone: String(phone || "").trim(),
      company: String(company || "").trim(),
      address: String(address || "").trim(),
      city: String(city || "").trim(),
      country: String(country || "").trim(),
      taxId: String(taxId || "").trim(),
      category: String(category || "").trim(),
      notes: String(notes || "").trim(),
      isActive: isActive !== false,
    });
    return res.status(201).json(supplier);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create supplier" });
  }
};

exports.getSupplierById = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const supplier = await Supplier.findOne({ _id: req.params.id, user: { $in: teamMemberIds } }).lean();
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    return res.json(supplier);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get supplier" });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const supplier = await Supplier.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    const fields = ["name", "email", "phone", "company", "address", "city", "country", "taxId", "category", "notes", "isActive"];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        if (f === "isActive") supplier[f] = !!req.body[f];
        else supplier[f] = typeof req.body[f] === "string" ? req.body[f].trim() : req.body[f];
      }
    });
    await supplier.save();
    return res.json(supplier);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update supplier" });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const supplier = await Supplier.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    const hasOpenPO = await PurchaseOrder.findOne({ supplier: supplier._id, status: { $in: ["draft", "sent", "partial"] } });
    if (hasOpenPO) return res.status(400).json({ message: "Cannot delete supplier with open purchase orders" });
    await Supplier.deleteOne({ _id: supplier._id });
    return res.json({ message: "Supplier deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete supplier" });
  }
};

// -------- Warehouses --------
exports.getWarehouses = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const warehouses = await Warehouse.find({ user: { $in: teamMemberIds } }).sort({ name: 1 }).lean();
    return res.json(warehouses);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get warehouses" });
  }
};

exports.createWarehouse = async (req, res) => {
  try {
    const { name, code, address, branch, isDefault, isActive } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Name is required" });
    if (isDefault) await Warehouse.updateMany({ user: req.user._id }, { isDefault: false });
    const warehouse = await Warehouse.create({
      user: req.user._id,
      name: String(name).trim(),
      code: String(code || "").trim(),
      address: String(address || "").trim(),
      branch: branch || null,
      isDefault: !!isDefault,
      isActive: isActive !== false,
    });
    return res.status(201).json(warehouse);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create warehouse" });
  }
};

exports.updateWarehouse = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const warehouse = await Warehouse.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });
    const { name, code, address, branch, isDefault, isActive } = req.body;
    if (name !== undefined) warehouse.name = String(name).trim();
    if (code !== undefined) warehouse.code = String(code).trim();
    if (address !== undefined) warehouse.address = String(address).trim();
    if (branch !== undefined) warehouse.branch = branch || null;
    if (isDefault !== undefined) {
      if (isDefault) await Warehouse.updateMany({ user: req.user._id, _id: { $ne: warehouse._id } }, { isDefault: false });
      warehouse.isDefault = !!isDefault;
    }
    if (isActive !== undefined) warehouse.isActive = !!isActive;
    await warehouse.save();
    return res.json(warehouse);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update warehouse" });
  }
};

exports.deleteWarehouse = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const warehouse = await Warehouse.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });
    await StockLevel.deleteMany({ warehouse: warehouse._id });
    await Warehouse.deleteOne({ _id: warehouse._id });
    return res.json({ message: "Warehouse deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete warehouse" });
  }
};

// -------- Stock levels (by warehouse) --------
exports.getStockLevels = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { warehouseId } = req.query;
    const filter = { user: { $in: teamMemberIds } };
    if (warehouseId) filter.warehouse = warehouseId;
    const levels = await StockLevel.find(filter)
      .populate("item", "name sku unit")
      .populate("warehouse", "name code")
      .lean();
    return res.json(levels);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get stock levels" });
  }
};

exports.upsertStockLevel = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { itemId, warehouseId, quantity, reorderLevel } = req.body;
    if (!itemId || !warehouseId) return res.status(400).json({ message: "itemId and warehouseId are required" });
    const [item, warehouse] = await Promise.all([
      Item.findOne({ _id: itemId, user: { $in: teamMemberIds } }),
      Warehouse.findOne({ _id: warehouseId, user: { $in: teamMemberIds } }),
    ]);
    if (!item || !warehouse) return res.status(404).json({ message: "Item or warehouse not found" });
    let level = await StockLevel.findOne({ user: req.user._id, item: itemId, warehouse: warehouseId });
    if (!level) level = new StockLevel({ user: req.user._id, item: itemId, warehouse: warehouseId, quantity: 0, reorderLevel: 0 });
    if (quantity !== undefined) level.quantity = Number(quantity);
    if (reorderLevel !== undefined) level.reorderLevel = Number(reorderLevel);
    await level.save();
    const populated = await StockLevel.findById(level._id).populate("item", "name sku unit").populate("warehouse", "name code").lean();
    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update stock level" });
  }
};

// -------- Low-stock alerts --------
exports.getLowStockAlerts = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const items = await Item.find({ user: { $in: teamMemberIds }, trackStock: true }).lean();
    const alerts = items.filter((i) => (i.quantityInStock ?? 0) <= (i.reorderLevel ?? 0)).map((i) => ({
      _id: i._id,
      name: i.name,
      sku: i.sku,
      quantityInStock: i.quantityInStock,
      reorderLevel: i.reorderLevel,
      unit: i.unit,
    }));
    const warehouseId = req.query.warehouseId;
    if (warehouseId) {
      const levels = await StockLevel.find({ user: { $in: teamMemberIds }, warehouse: warehouseId })
        .populate("item", "name sku unit")
        .populate("warehouse", "name code")
        .lean();
      levels.forEach((l) => {
        if ((l.quantity ?? 0) <= (l.reorderLevel ?? 0) && l.quantity !== undefined) {
          alerts.push({
            _id: l.item?._id,
            name: l.item?.name,
            sku: l.item?.sku,
            unit: l.item?.unit,
            quantityInStock: l.quantity,
            reorderLevel: l.reorderLevel,
            warehouse: l.warehouse,
          });
        }
      });
    }
    return res.json(alerts);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get low-stock alerts" });
  }
};

// -------- Purchase orders --------
exports.getPurchaseOrders = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { status } = req.query;
    const filter = { user: { $in: teamMemberIds } };
    if (status) filter.status = status;
    const pos = await PurchaseOrder.find(filter)
      .populate("supplier", "name company email")
      .populate("lines.item", "name sku unit")
      .sort({ updatedAt: -1 })
      .lean();
    return res.json(pos);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get purchase orders" });
  }
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { orderNumber, supplierId, warehouseId, orderDate, expectedDate, status, notes, lines, currency } = req.body;
    if (!orderNumber || !supplierId) return res.status(400).json({ message: "orderNumber and supplierId are required" });
    const supplier = await Supplier.findOne({ _id: supplierId, user: { $in: teamMemberIds } });
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    const existing = await PurchaseOrder.findOne({ user: req.user._id, orderNumber: String(orderNumber).trim() });
    if (existing) return res.status(400).json({ message: "Order number already exists" });
    const lineList = Array.isArray(lines) ? lines : [];
    let totalAmount = 0;
    for (const line of lineList) {
      const item = await Item.findOne({ _id: line.item, user: { $in: teamMemberIds } });
      if (!item) throw new Error(`Item ${line.item} not found`);
      const qty = Number(line.quantity) || 0;
      const price = Number(line.unitPrice) || 0;
      totalAmount += qty * price;
    }
    const po = await PurchaseOrder.create({
      user: req.user._id,
      supplier: supplier._id,
      warehouse: warehouseId || null,
      orderNumber: String(orderNumber).trim(),
      status: status || "draft",
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      notes: String(notes || "").trim(),
      totalAmount: Math.round(totalAmount * 100) / 100,
      currency: currency || "GHS",
      lines: lineList.map((l) => ({
        item: l.item,
        quantity: Number(l.quantity) || 0,
        quantityReceived: 0,
        unitPrice: Number(l.unitPrice) || 0,
        unit: l.unit || "",
      })),
    });
    const populated = await PurchaseOrder.findById(po._id)
      .populate("supplier", "name company email")
      .populate("lines.item", "name sku unit")
      .lean();
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create purchase order" });
  }
};

exports.getPurchaseOrderById = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const po = await PurchaseOrder.findOne({ _id: req.params.id, user: { $in: teamMemberIds } })
      .populate("supplier", "name company email phone address")
      .populate("warehouse", "name code")
      .populate("lines.item", "name sku unit")
      .lean();
    if (!po) return res.status(404).json({ message: "Purchase order not found" });
    return res.json(po);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get purchase order" });
  }
};

exports.updatePurchaseOrder = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const po = await PurchaseOrder.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!po) return res.status(404).json({ message: "Purchase order not found" });
    if (po.status === "received") return res.status(400).json({ message: "Cannot edit received PO" });
    const { orderNumber, supplierId, warehouseId, orderDate, expectedDate, status, notes, lines, currency } = req.body;
    if (orderNumber !== undefined) po.orderNumber = String(orderNumber).trim();
    if (supplierId !== undefined) {
      const supplier = await Supplier.findOne({ _id: supplierId, user: { $in: teamMemberIds } });
      if (supplier) po.supplier = supplier._id;
    }
    if (warehouseId !== undefined) po.warehouse = warehouseId || null;
    if (orderDate !== undefined) po.orderDate = orderDate ? new Date(orderDate) : po.orderDate;
    if (expectedDate !== undefined) po.expectedDate = expectedDate ? new Date(expectedDate) : null;
    if (status !== undefined) po.status = status;
    if (notes !== undefined) po.notes = String(notes).trim();
    if (currency !== undefined) po.currency = currency;
    if (Array.isArray(lines)) {
      let totalAmount = 0;
      po.lines = lines.map((l) => {
        const qty = Number(l.quantity) || 0;
        const price = Number(l.unitPrice) || 0;
        totalAmount += qty * price;
        return {
          item: l.item,
          quantity: qty,
          quantityReceived: l.quantityReceived ?? 0,
          unitPrice: price,
          unit: l.unit || "",
        };
      });
      po.totalAmount = Math.round(totalAmount * 100) / 100;
    }
    await po.save();
    const populated = await PurchaseOrder.findById(po._id)
      .populate("supplier", "name company email")
      .populate("lines.item", "name sku unit")
      .lean();
    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update purchase order" });
  }
};

exports.deletePurchaseOrder = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const po = await PurchaseOrder.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!po) return res.status(404).json({ message: "Purchase order not found" });
    if (po.status === "received") return res.status(400).json({ message: "Cannot delete received PO" });
    await PurchaseOrder.deleteOne({ _id: po._id });
    return res.json({ message: "Purchase order deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete purchase order" });
  }
};

exports.receivePurchaseOrder = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const po = await PurchaseOrder.findOne({ _id: req.params.id, user: { $in: teamMemberIds } })
      .populate("lines.item");
    if (!po) return res.status(404).json({ message: "Purchase order not found" });
    if (po.status === "cancelled") return res.status(400).json({ message: "PO is cancelled" });
    const { lines } = req.body;
    if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ message: "lines array with lineId and quantityReceived is required" });
    let anyReceived = false;
    for (const rec of lines) {
      const lineId = rec.lineId || rec._id;
      const line = po.lines.id(lineId);
      if (!line) continue;
      const qty = Number(rec.quantityReceived);
      if (qty <= 0) continue;
      const item = line.item;
      if (!item) continue;
      const itemDoc = await Item.findById(item._id);
      if (!itemDoc || !teamMemberIds.some((id) => id.toString() === itemDoc.user.toString())) continue;
      const maxQty = line.quantity - (line.quantityReceived || 0);
      const receiveQty = Math.min(qty, maxQty);
      if (receiveQty <= 0) continue;
      if (itemDoc.trackStock) {
        itemDoc.quantityInStock = (itemDoc.quantityInStock || 0) + receiveQty;
        await itemDoc.save();
      }
      await StockMovement.create({
        item: item._id,
        type: "in",
        quantity: receiveQty,
        reason: "PO receive",
        reference: po.orderNumber,
        referenceType: "purchase_order",
        warehouse: po.warehouse || null,
        user: req.user._id,
      });
      line.quantityReceived = (line.quantityReceived || 0) + receiveQty;
      anyReceived = true;
    }
    if (!anyReceived) return res.status(400).json({ message: "No valid quantities to receive" });
    const allReceived = po.lines.every((l) => (l.quantityReceived || 0) >= l.quantity);
    po.status = allReceived ? "received" : "partial";
    if (allReceived) po.receivedAt = new Date();
    await po.save();
    const populated = await PurchaseOrder.findById(po._id)
      .populate("supplier", "name company email")
      .populate("lines.item", "name sku unit")
      .lean();
    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to receive PO" });
  }
};

// -------- Forecasts --------
exports.getForecasts = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { itemId, periodYear, periodType } = req.query;
    const filter = { user: { $in: teamMemberIds } };
    if (itemId) filter.item = itemId;
    if (periodYear) filter.periodYear = Number(periodYear);
    if (periodType) filter.periodType = periodType;
    const forecasts = await Forecast.find(filter)
      .populate("item", "name sku unit")
      .sort({ periodYear: 1, periodMonth: 1, periodWeek: 1 })
      .lean();
    return res.json(forecasts);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get forecasts" });
  }
};

exports.createForecast = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const { itemId, periodType, periodYear, periodMonth, periodWeek, quantity, source } = req.body;
    if (!itemId || periodYear == null || quantity == null) return res.status(400).json({ message: "itemId, periodYear, and quantity are required" });
    const item = await Item.findOne({ _id: itemId, user: { $in: teamMemberIds } });
    if (!item) return res.status(404).json({ message: "Item not found" });
    const forecast = await Forecast.create({
      user: req.user._id,
      item: item._id,
      periodType: periodType || "monthly",
      periodYear: Number(periodYear),
      periodMonth: periodMonth != null ? Number(periodMonth) : null,
      periodWeek: periodWeek != null ? Number(periodWeek) : null,
      quantity: Number(quantity),
      source: source || "manual",
    });
    const populated = await Forecast.findById(forecast._id).populate("item", "name sku unit").lean();
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create forecast" });
  }
};

exports.updateForecast = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const forecast = await Forecast.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!forecast) return res.status(404).json({ message: "Forecast not found" });
    const { quantity, periodYear, periodMonth, periodWeek } = req.body;
    if (quantity !== undefined) forecast.quantity = Number(quantity);
    if (periodYear !== undefined) forecast.periodYear = Number(periodYear);
    if (periodMonth !== undefined) forecast.periodMonth = periodMonth != null ? Number(periodMonth) : null;
    if (periodWeek !== undefined) forecast.periodWeek = periodWeek != null ? Number(periodWeek) : null;
    await forecast.save();
    const populated = await Forecast.findById(forecast._id).populate("item", "name sku unit").lean();
    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update forecast" });
  }
};

exports.deleteForecast = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const forecast = await Forecast.findOne({ _id: req.params.id, user: { $in: teamMemberIds } });
    if (!forecast) return res.status(404).json({ message: "Forecast not found" });
    await Forecast.deleteOne({ _id: forecast._id });
    return res.json({ message: "Forecast deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete forecast" });
  }
};
