const express = require("express");
const { getNotes, createNote, updateNote, deleteNote } = require("../controller/sectionNoteController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/", getNotes);
router.post("/", createNote);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

module.exports = router;
