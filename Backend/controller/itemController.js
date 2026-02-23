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

module.exports = {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  adjustStock,
  getStockMovements,
};
