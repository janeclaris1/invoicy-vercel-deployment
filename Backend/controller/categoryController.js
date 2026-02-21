const Category = require('../models/Category');
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

// @desc    Get all categories for logged-in user and their team (with item counts)
// @route   GET /api/categories
// @access  Private
const getCategories = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const categories = await Category.find({ user: { $in: teamMemberIds } }).sort({ createdAt: -1 });
    const items = await Item.find({ user: { $in: teamMemberIds } });
    const countByCategory = items.reduce((acc, item) => {
      const cat = item.category || '';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    const withCounts = categories.map((c) => ({
      ...c.toObject(),
      id: c._id,
      itemCount: countByCategory[c.name] || 0,
    }));
    res.json(withCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private
const createCategory = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const category = await Category.create({
      user: req.user._id,
      name: name || '',
      description: description || '',
      color: color || '#3B82F6',
    });
    res.status(201).json({ ...category.toObject(), id: category._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    
    // Check if the category belongs to the logged-in user or a team member
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    if (!teamMemberIds.some(id => id.toString() === category.user.toString())) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const { name, description, color } = req.body;
    category.name = name ?? category.name;
    category.description = description ?? category.description;
    category.color = color ?? category.color;
    await category.save();
    res.json({ ...category.toObject(), id: category._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    
    // Check if the category belongs to the logged-in user or a team member
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    if (!teamMemberIds.some(id => id.toString() === category.user.toString())) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    await category.deleteOne();
    res.json({ message: 'Category removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
