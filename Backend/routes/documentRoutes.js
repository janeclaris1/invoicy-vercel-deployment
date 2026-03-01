const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { list, upload, getById, remove } = require("../controller/documentController");

const router = express.Router();
router.use(protect);

router.get("/", list);
router.post("/", upload);
router.get("/:id", getById);
router.delete("/:id", remove);

module.exports = router;
