const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  getTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
} = require("../controller/projectController");

const router = express.Router();
router.use(protect);

// Projects
router.get("/", getProjects);
router.post("/", createProject);
router.get("/time-entries", getTimeEntries);
router.post("/time-entries", createTimeEntry);
router.put("/time-entries/:id", updateTimeEntry);
router.delete("/time-entries/:id", deleteTimeEntry);

router.get("/:id", getProjectById);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);

// Tasks (nested under project)
router.get("/:projectId/tasks", getTasks);
router.post("/:projectId/tasks", createTask);
router.put("/:projectId/tasks/:taskId", updateTask);
router.delete("/:projectId/tasks/:taskId", deleteTask);

// Milestones (nested under project)
router.get("/:projectId/milestones", getMilestones);
router.post("/:projectId/milestones", createMilestone);
router.put("/:projectId/milestones/:milestoneId", updateMilestone);
router.delete("/:projectId/milestones/:milestoneId", deleteMilestone);

module.exports = router;
