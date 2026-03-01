const mongoose = require("mongoose");

const projectTaskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["todo", "in_progress", "review", "done"], default: "todo" },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    dueDate: { type: Date, default: null },
    estimatedHours: { type: Number, default: null },
    completedAt: { type: Date, default: null },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

projectTaskSchema.index({ project: 1, status: 1 });
projectTaskSchema.index({ assignee: 1 });

module.exports = mongoose.model("ProjectTask", projectTaskSchema);
