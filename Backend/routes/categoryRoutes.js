const express = require('express');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controller/categoryController.js');
const { protect } = require('../middlewares/authMiddleware.js');

const router = express.Router();

router.route('/')
  .get(protect, getCategories)
  .post(protect, createCategory);

router.route('/:id')
  .put(protect, updateCategory)
  .delete(protect, deleteCategory);

module.exports = router;
