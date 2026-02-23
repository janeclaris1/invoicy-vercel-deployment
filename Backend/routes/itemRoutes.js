const express = require('express');
const {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  adjustStock,
  getStockMovements,
} = require('../controller/itemController.js');
const { protect } = require('../middlewares/authMiddleware.js');

const router = express.Router();

router.route('/')
  .get(protect, getItems)
  .post(protect, createItem);

// Stock movements list (must be before /:id so "stock" is not an id)
router.get('/stock/movements', protect, getStockMovements);

router.route('/:id')
  .put(protect, updateItem)
  .delete(protect, deleteItem);

router.get('/:id/movements', protect, getStockMovements);
router.post('/:id/adjust-stock', protect, adjustStock);

module.exports = router;
