const express = require("express");
const { getWorkflows, getWorkflowById, createWorkflow, updateWorkflow, deleteWorkflow } = require("../controller/workflowController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").get(protect, getWorkflows).post(protect, createWorkflow);
router.route("/:id").get(protect, getWorkflowById).put(protect, updateWorkflow).delete(protect, deleteWorkflow);

module.exports = router;
