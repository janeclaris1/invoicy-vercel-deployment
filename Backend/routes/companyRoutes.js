const express = require("express");
const { getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany } = require("../controller/companyController");
const { protect } = require("../middlewares/authMiddleware");
const { attachSubscriptionPlan, requirePlanPermission } = require("../middlewares/planMiddleware");

const router = express.Router();
router.use(protect);
router.use(attachSubscriptionPlan);
router.use(requirePlanPermission("crm.companies"));
router.route("/").get(getCompanies).post(createCompany);
router.route("/:id").get(getCompanyById).put(updateCompany).delete(deleteCompany);
module.exports = router;
