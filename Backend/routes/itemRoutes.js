const express = require('express');
const {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  adjustStock,
  getStockMovements,
  getStockReport,
  importItems,
} = require('../controller/itemController.js');
const { protect } = require('../middlewares/authMiddleware.js');
const uploadItemsFile = require('../middlewares/uploadItemsFile.js');

const router = express.Router();

router.route('/')
  .get(protect, getItems)
  .post(protect, createItem);

// Import items from CSV/Excel (must be before /:id)
router.post('/import', protect, (req, res, next) => {
  uploadItemsFile(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'File upload failed' });
    next();
  });
}, importItems);

// Stock movements list and report (must be before /:id so "stock" is not an id)
router.get('/stock/movements', protect, getStockMovements);
router.get('/stock/report', protect, getStockReport);

router.route('/:id')
  .put(protect, updateItem)
  .delete(protect, deleteItem);

router.get('/:id/movements', protect, getStockMovements);
router.post('/:id/adjust-stock', protect, adjustStock);

module.exports = router;
