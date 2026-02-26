const express = require("express");
const { getLists, getListById, createList, updateList, deleteList } = require("../controller/marketingListController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();
router.route("/").get(protect, getLists).post(protect, createList);
router.route("/:id").get(protect, getListById).put(protect, updateList).delete(protect, deleteList);
module.exports = router;
