const express = require("express");
const { getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany } = require("../controller/companyController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();
router.route("/").get(protect, getCompanies).post(protect, createCompany);
router.route("/:id").get(protect, getCompanyById).put(protect, updateCompany).delete(protect, deleteCompany);
module.exports = router;
