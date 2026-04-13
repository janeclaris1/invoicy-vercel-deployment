const express = require("express");
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require("../controller/customerController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").get(protect, getCustomers).post(protect, createCustomer);
router.route("/:id").get(protect, getCustomerById).put(protect, updateCustomer).delete(protect, deleteCustomer);

module.exports = router;
