const Item = require('../models/Item');
const User = require('../models/User');

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
    const { name, description, category, categoryColor, price, unit, sku, taxRate } = req.body;
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
    const { name, description, category, categoryColor, price, unit, sku, taxRate } = req.body;
    item.name = name ?? item.name;
    item.description = description ?? item.description;
    item.category = category ?? item.category;
    item.categoryColor = categoryColor ?? item.categoryColor;
    item.price = price !== undefined ? Number(price) : item.price;
    item.unit = unit ?? item.unit;
    item.sku = sku ?? item.sku;
    item.taxRate = taxRate !== undefined ? Number(taxRate) : item.taxRate;
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

module.exports = {
  getItems,
  createItem,
  updateItem,
  deleteItem,
};
