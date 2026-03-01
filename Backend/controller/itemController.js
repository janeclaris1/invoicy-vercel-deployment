const Item = require('../models/Item');
const User = require('../models/User');
const StockMovement = require('../models/StockMovement');

// Helper function to get team member IDs (users with same createdBy or the creator themselves)
const getTeamMemberIds = async (currentUserId) => {
  const currentUser = await User.findById(currentUserId);
  if (!currentUser) return [currentUserId];
  
  // If user is the original owner (no createdBy), return only their ID
  if (!currentUser.createdBy) {
    return [currentUserId];
  }
  
  // Find all team members: users created by the same person, or the creator themselves
  const teamMembers = await User.find({
    $or: [
      { createdBy: currentUser.createdBy },
      { _id: currentUser.createdBy },
    ]
  }).select('_id');
  
  return teamMembers.map(member => member._id);
};

// @desc    Get all items for logged-in user and their team
// @route   GET /api/items
// @access  Private
const getItems = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const items = await Item.find({ user: { $in: teamMemberIds } }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new item
// @route   POST /api/items
// @access  Private
const createItem = async (req, res) => {
  try {
    const { name, description, category, categoryColor, price, unit, sku, taxRate, trackStock, quantityInStock, reorderLevel } = req.body;
    const item = await Item.create({
      user: req.user._id,
      name,
      description: description || '',
      category: category || '',
      categoryColor: categoryColor || '#3B82F6',
      price: Number(price) || 0,
      unit: unit || 'unit',
      sku: sku || '',
      taxRate: Number(taxRate) || 0,
      trackStock: Boolean(trackStock),
      quantityInStock: trackStock ? Number(quantityInStock) || 0 : 0,
      reorderLevel: trackStock ? Number(reorderLevel) || 0 : 0,
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private
const updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    // Check if the item belongs to the logged-in user or a team member
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    if (!teamMemberIds.some(id => id.toString() === item.user.toString())) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const { name, description, category, categoryColor, price, unit, sku, taxRate, trackStock, quantityInStock, reorderLevel } = req.body;
    item.name = name ?? item.name;
    item.description = description ?? item.description;
    item.category = category ?? item.category;
    item.categoryColor = categoryColor ?? item.categoryColor;
    item.price = price !== undefined ? Number(price) : item.price;
    item.unit = unit ?? item.unit;
    item.sku = sku ?? item.sku;
    item.taxRate = taxRate !== undefined ? Number(taxRate) : item.taxRate;
    if (trackStock !== undefined) item.trackStock = Boolean(trackStock);
    if (quantityInStock !== undefined && item.trackStock) item.quantityInStock = Number(quantityInStock);
    if (reorderLevel !== undefined && item.trackStock) item.reorderLevel = Number(reorderLevel);
    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private
const deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    // Check if the item belongs to the logged-in user or a team member
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    if (!teamMemberIds.some(id => id.toString() === item.user.toString())) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    await item.deleteOne();
    res.json({ message: 'Item removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Adjust stock for an item (in / out / adjustment)
// @route   POST /api/items/:id/adjust-stock
// @access  Private
const adjustStock = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const teamMemberIds = await getTeamMemberIds(req.user._id);
    if (!teamMemberIds.some(id => id.toString() === item.user.toString())) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!item.trackStock) {
      return res.status(400).json({ message: 'Stock tracking is not enabled for this item. Enable it in the item settings first.' });
    }

    const { type, quantity, reason, reference } = req.body;
    if (!type || !['in', 'out', 'adjustment'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Use: in, out, or adjustment' });
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number' });
    }

    let newQuantity = item.quantityInStock;
    if (type === 'in') newQuantity += qty;
    else if (type === 'out') {
      if (qty > item.quantityInStock) {
        return res.status(400).json({ message: `Insufficient stock. Current: ${item.quantityInStock}` });
      }
      newQuantity -= qty;
    } else {
      // adjustment: set to exact quantity (reason should describe the correction)
      newQuantity = qty;
    }

    item.quantityInStock = Math.max(0, newQuantity);
    await item.save();

    await StockMovement.create({
      item: item._id,
      type,
      quantity: type === 'adjustment' ? qty : qty,
      reason: reason || '',
      reference: reference || '',
      user: req.user._id,
    });

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get stock movements for an item (or all for user's items)
// @route   GET /api/items/:id/movements or GET /api/items/stock/movements?itemId=
// @access  Private
const getStockMovements = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const itemId = req.params.id || req.query.itemId;

    if (itemId) {
      const item = await Item.findById(itemId);
      if (!item) return res.status(404).json({ message: 'Item not found' });
      if (!teamMemberIds.some(id => id.toString() === item.user.toString())) {
        return res.status(401).json({ message: 'Not authorized' });
      }
      const movements = await StockMovement.find({ item: itemId })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('user', 'name');
      return res.json(movements);
    }

    const items = await Item.find({ user: { $in: teamMemberIds } }).select('_id');
    const itemIds = items.map(i => i._id);
    const movements = await StockMovement.find({ item: { $in: itemIds } })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('item', 'name sku')
      .populate('user', 'name');
    res.json(movements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get stock report for a date range (items with stock + movements)
// @route   GET /api/items/stock/report?from=YYYY-MM-DD&to=YYYY-MM-DD
// @access  Private
const getStockReport = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    let from = req.query.from ? new Date(req.query.from) : null;
    let to = req.query.to ? new Date(req.query.to) : null;
    if (!to || isNaN(to.getTime())) to = new Date();
    if (!from || isNaN(from.getTime())) {
      from = new Date(to);
      from.setDate(from.getDate() - 30);
    }
    if (from > to) [from, to] = [to, from];

    const items = await Item.find({
      user: { $in: teamMemberIds },
      trackStock: true,
    }).sort({ name: 1 });

    const itemIds = items.map((i) => i._id);
    const movements = await StockMovement.find({
      item: { $in: itemIds },
      createdAt: { $gte: from, $lte: to },
    })
      .sort({ createdAt: -1 })
      .populate('item', 'name sku unit')
      .populate('user', 'name');

    res.json({
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: new Date().toISOString(),
      items: items.map((i) => ({
        _id: i._id,
        name: i.name,
        sku: i.sku,
        unit: i.unit,
        quantityInStock: i.quantityInStock,
        reorderLevel: i.reorderLevel,
      })),
      movements,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Parse a single CSV line (handles quoted fields)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || (c === '\r' && !inQuotes)) {
      result.push(current.trim());
      current = '';
    } else if (c !== '\r') {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

// @desc    Import items from CSV/Excel file
// @route   POST /api/items/import
// @access  Private
const importItems = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file uploaded. Use form field "file".' });
    }
    const buffer = req.file.buffer;
    const filename = (req.file.originalname || '').toLowerCase();
    let rows = [];

    if (filename.endsWith('.csv') || req.file.mimetype === 'text/csv') {
      const text = buffer.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) {
        return res.status(400).json({ message: 'CSV must have a header row and at least one data row.' });
      }
      const header = parseCSVLine(lines[0]).map((h) => (h || '').trim().toLowerCase().replace(/\s+/g, ' '));
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        header.forEach((col, j) => {
          row[col] = values[j] !== undefined ? String(values[j]).trim() : '';
        });
        rows.push(row);
      }
    } else {
      // Excel .xlsx / .xls - try using optional xlsx
      try {
        const XLSX = require('xlsx');
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false });
        rows = rows.map((r) => {
          const out = {};
          Object.keys(r).forEach((k) => {
            const normalized = String(k).trim().toLowerCase().replace(/\s+/g, ' ');
            out[normalized] = r[k] != null ? String(r[k]).trim() : '';
          });
          return out;
        });
      } catch (e) {
        return res.status(400).json({
          message: 'Excel files require the xlsx package. Install it with: npm install xlsx. Or save the file as CSV and upload again.',
        });
      }
    }

    // Helper to get cell value by common header names
    const getVal = (row, ...keys) => {
      for (const k of keys) {
        const v = row[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
      }
      return '';
    };
    const getNum = (row, ...keys) => {
      const v = getVal(row, ...keys);
      return parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;
    };
    const getBool = (row, ...keys) => {
      const v = getVal(row, ...keys).toLowerCase();
      return /^(1|true|yes|y)$/.test(v);
    };

    const created = [];
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = getVal(row, 'name', 'product name', 'item name', 'product');
      if (!name) {
        errors.push({ row: i + 2, message: 'Name is required' });
        continue;
      }
      const priceNum = getNum(row, 'price', 'unit price', 'amount');
      const trackStock = getBool(row, 'track stock', 'trackstock', 'track inventory');
      const quantityInStock = parseInt(getVal(row, 'quantity in stock', 'quantity', 'qty', 'stock') || '0', 10) || 0;
      const reorderLevel = parseInt(getVal(row, 'reorder level', 'reorderlevel', 'reorder') || '0', 10) || 0;
      try {
        const item = await Item.create({
          user: req.user._id,
          name,
          description: getVal(row, 'description', 'desc', 'details'),
          category: getVal(row, 'category', 'category name'),
          categoryColor: '#3B82F6',
          price: priceNum,
          unit: getVal(row, 'unit', 'units', 'uom') || 'unit',
          sku: getVal(row, 'sku', 'code', 'item code'),
          taxRate: getNum(row, 'tax rate', 'taxrate', 'tax', 'vat'),
          trackStock,
          quantityInStock: trackStock ? quantityInStock : 0,
          reorderLevel: trackStock ? reorderLevel : 0,
        });
        created.push({ _id: item._id, name: item.name });
      } catch (err) {
        errors.push({ row: i + 2, message: err.message || 'Failed to create item' });
      }
    }

    res.status(201).json({
      message: `Imported ${created.length} item(s).`,
      created: created.length,
      createdIds: created.map((c) => c._id),
      errors: errors.length ? errors : undefined,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Import failed' });
  }
};

module.exports = {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  adjustStock,
  getStockMovements,
  getStockReport,
  importItems,
};
