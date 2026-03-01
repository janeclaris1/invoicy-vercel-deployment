const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const {
  getWorkOrders,
  createWorkOrder,
  getWorkOrderById,
  updateWorkOrder,
  deleteWorkOrder,
  getBOMs,
  getBOMByParent,
  createBOM,
  updateBOM,
  deleteBOM,
  getResources,
  createResource,
  updateResource,
  deleteResource,
  getCapacity,
  getAllocations,
  createAllocation,
  deleteAllocation,
  getMaintenanceSchedules,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
  getMaintenanceLogs,
  createMaintenanceLog,
} = require("../controller/productionController");

const router = express.Router();
router.use(protect);

// Work orders
router.get("/work-orders", getWorkOrders);
router.post("/work-orders", createWorkOrder);
router.get("/work-orders/:id", getWorkOrderById);
router.put("/work-orders/:id", updateWorkOrder);
router.delete("/work-orders/:id", deleteWorkOrder);

// BOM
router.get("/boms", getBOMs);
router.get("/boms/by-parent/:parentId", getBOMByParent);
router.post("/boms", createBOM);
router.put("/boms/:id", updateBOM);
router.delete("/boms/:id", deleteBOM);

// Resources
router.get("/resources", getResources);
router.post("/resources", createResource);
router.put("/resources/:id", updateResource);
router.delete("/resources/:id", deleteResource);

// Capacity & allocations (capacity is query-based, no :id conflict)
router.get("/capacity", getCapacity);
router.get("/allocations", getAllocations);
router.post("/allocations", createAllocation);
router.delete("/allocations/:id", deleteAllocation);

// Maintenance
router.get("/maintenance-schedules", getMaintenanceSchedules);
router.post("/maintenance-schedules", createMaintenanceSchedule);
router.put("/maintenance-schedules/:id", updateMaintenanceSchedule);
router.delete("/maintenance-schedules/:id", deleteMaintenanceSchedule);
router.get("/maintenance-logs", getMaintenanceLogs);
router.post("/maintenance-logs", createMaintenanceLog);

module.exports = router;
