const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { list, upload, getById, remove, exportDocx } = require("../controller/documentController");

const router = express.Router();
router.use(protect);

router.get("/", list);
router.post("/", upload);
router.post("/export-docx", exportDocx);
router.get("/:id", getById);
router.delete("/:id", remove);

module.exports = router;
