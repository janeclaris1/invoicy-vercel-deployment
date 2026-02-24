const express = require("express");
const {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateInvoice,
    deleteInvoice,
    convertProformaToInvoice
} = require("../controller/invoiceController.js");
const { protect } = require("../middlewares/authMiddleware.js");
const { validateInvoice, validateInvoiceUpdate } = require("../middlewares/validator");

const router = express.Router();

router.route("/")
    .post(protect, validateInvoice, createInvoice)
    .get(protect, getInvoices);

router.post("/:id/convert-to-invoice", protect, convertProformaToInvoice);

router
    .route("/:id")
    .get(protect, getInvoiceById)
    .put(protect, validateInvoiceUpdate, updateInvoice)
    .delete(protect, deleteInvoice);

module.exports = router;
