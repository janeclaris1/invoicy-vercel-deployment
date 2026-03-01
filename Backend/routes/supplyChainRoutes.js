const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const {
  getSuppliers,
  createSupplier,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getStockLevels,
  upsertStockLevel,
  getLowStockAlerts,
  getPurchaseOrders,
  createPurchaseOrder,
  getPurchaseOrderById,
  updatePurchaseOrder,
  deletePurchaseOrder,
  receivePurchaseOrder,
  getForecasts,
  createForecast,
  updateForecast,
  deleteForecast,
} = require("../controller/supplyChainController");

const router = express.Router();
router.use(protect);

router.get("/suppliers", getSuppliers);
router.post("/suppliers", createSupplier);
router.get("/suppliers/:id", getSupplierById);
router.put("/suppliers/:id", updateSupplier);
router.delete("/suppliers/:id", deleteSupplier);

router.get("/warehouses", getWarehouses);
router.post("/warehouses", createWarehouse);
router.put("/warehouses/:id", updateWarehouse);
router.delete("/warehouses/:id", deleteWarehouse);

router.get("/stock-levels", getStockLevels);
router.post("/stock-levels", upsertStockLevel);

router.get("/alerts/low-stock", getLowStockAlerts);

router.get("/purchase-orders", getPurchaseOrders);
router.post("/purchase-orders", createPurchaseOrder);
router.get("/purchase-orders/:id", getPurchaseOrderById);
router.put("/purchase-orders/:id", updatePurchaseOrder);
router.delete("/purchase-orders/:id", deletePurchaseOrder);
router.post("/purchase-orders/:id/receive", receivePurchaseOrder);

router.get("/forecasts", getForecasts);
router.post("/forecasts", createForecast);
router.put("/forecasts/:id", updateForecast);
router.delete("/forecasts/:id", deleteForecast);

module.exports = router;
