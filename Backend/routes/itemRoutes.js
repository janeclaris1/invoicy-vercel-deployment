const express = require('express');
const {
  getItems,
  createItem,
  updateItem,
  deleteItem,
} = require('../controller/itemController.js');
const { protect } = require('../middlewares/authMiddleware.js');

const router = express.Router();

router.route('/')
  .get(protect, getItems)
  .post(protect, createItem);

router.route('/:id')
  .put(protect, updateItem)
  .delete(protect, deleteItem);

module.exports = router;
