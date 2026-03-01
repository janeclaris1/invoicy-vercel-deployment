const express = require("express");
const { getBranches, getBranchById, getBranchDashboard, getBranchEmployees, createBranch, updateBranch, deleteBranch } = require("../controller/branchController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/", getBranches);
router.get("/dashboard", getBranchDashboard);
router.get("/:id", getBranchById);
router.get("/:id/employees", getBranchEmployees);
router.post("/", createBranch);
router.put("/:id", updateBranch);
router.delete("/:id", deleteBranch);

module.exports = router;
