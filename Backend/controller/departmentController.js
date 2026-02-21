const Department = require('../models/Department');
const User = require('../models/User');

const getTeamMemberIds = async (currentUserId) => {
  const currentUser = await User.findById(currentUserId);
  if (!currentUser) return [currentUserId.toString()];
  if (!currentUser.createdBy) return [currentUserId.toString()];
  const teamMembers = await User.find({
    $or: [
      { createdBy: currentUser.createdBy },
      { _id: currentUser.createdBy },
      { _id: currentUserId },
    ]
  }).select('_id');
  const ids = teamMembers.map(m => m._id.toString());
  if (!ids.includes(currentUserId.toString())) ids.push(currentUserId.toString());
  return ids;
};

const getDepartments = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const objectIds = teamMemberIds.map(id => {
      try {
        return require('mongoose').Types.ObjectId(id);
      } catch {
        return id;
      }
    });
    const departments = await Department.find({ user: { $in: objectIds } }).sort({ name: 1 });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required' });
    }
    const department = await Department.create({
      user: req.user._id,
      name: name.trim(),
      code: (code || '').trim(),
      description: (description || '').trim(),
    });
    res.status(201).json(department);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A department with this name already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });
    if (!teamMemberIds.includes(department.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to update this department' });
    }
    const { name, code, description } = req.body;
    if (name !== undefined) department.name = name.trim();
    if (code !== undefined) department.code = code.trim();
    if (description !== undefined) department.description = description.trim();
    await department.save();
    res.json(department);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A department with this name already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });
    if (!teamMemberIds.includes(department.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to delete this department' });
    }
    await Department.findByIdAndDelete(req.params.id);
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDepartments, createDepartment, updateDepartment, deleteDepartment };
