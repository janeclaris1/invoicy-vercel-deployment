const express = require("express");
const { getContacts, getContactById, createContact, updateContact, deleteContact } = require("../controller/contactController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();
router.route("/").get(protect, getContacts).post(protect, createContact);
router.route("/:id").get(protect, getContactById).put(protect, updateContact).delete(protect, deleteContact);
module.exports = router;
