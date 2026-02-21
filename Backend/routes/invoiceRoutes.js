const express = require("express");
const {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateInvoice,
    deleteInvoice
} = require("../controller/invoiceController.js");
const { protect } = require("../middlewares/authMiddleware.js");
const { validateInvoice } = require("../middlewares/validator");

const router = express.Router();

router.route("/")
    .post(protect, validateInvoice, createInvoice)
    .get(protect, getInvoices);

router
    .route("/:id")
    .get(protect, getInvoiceById)
    .put(protect, validateInvoice, updateInvoice)
    .delete(protect, deleteInvoice);

module.exports = router;
