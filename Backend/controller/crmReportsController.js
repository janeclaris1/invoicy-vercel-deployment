const Deal = require("../models/Deal");
const Lead = require("../models/Lead");
const Activity = require("../models/Activity");
const Contact = require("../models/Contact");
const logger = require("../utils/logger");

const getReports = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [deals, leads, activities, contacts, meetings] = await Promise.all([
      Deal.find({ user: userId }).lean(),
      Lead.find({ user: userId }).lean(),
      Activity.find({ user: userId }).lean(),
      Contact.countDocuments({ user: userId }),
      Activity.find({
        user: userId,
        type: "meeting",
        $or: [{ dueDate: null }, { dueDate: { $gte: startOfToday } }],
      })
        .sort({ dueDate: 1 })
        .limit(20)
        .populate("contact", "firstName lastName email")
        .populate("lead", "name email")
        .populate("deal", "name value stage")
        .lean(),
    ]);

    const pipelineByStage = {};
    const stages = ["qualification", "proposal", "negotiation", "won", "lost"];
    stages.forEach((s) => {
      pipelineByStage[s] = { count: 0, value: 0, currency: "GHS" };
    });
    deals.forEach((d) => {
      if (pipelineByStage[d.stage]) {
        pipelineByStage[d.stage].count += 1;
        pipelineByStage[d.stage].value += Number(d.value) || 0;
        pipelineByStage[d.stage].currency = d.currency || "GHS";
      }
    });
    const pipeline = stages.map((stage) => ({
      stage,
      ...pipelineByStage[stage],
    }));

    const leadsByStatus = {};
    ["new", "contacted", "qualified", "converted", "lost"].forEach((s) => {
      leadsByStatus[s] = leads.filter((l) => l.status === s).length;
    });

    const activitiesByType = {};
    ["email", "call", "meeting", "note", "task"].forEach((t) => {
      activitiesByType[t] = activities.filter((a) => a.type === t).length;
    });

    const totalPipelineValue = deals.filter((d) => d.stage !== "lost").reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    const wonValue = deals.filter((d) => d.stage === "won").reduce((sum, d) => sum + (Number(d.value) || 0), 0);

    res.json({
      summary: {
        totalContacts: contacts,
        totalLeads: leads.length,
        totalDeals: deals.length,
        totalPipelineValue,
        wonValue,
      },
      pipeline,
      leadsByStatus,
      activitiesByType,
      upcomingMeetings: meetings,
      recentActivityCount: activities.length,
    });
  } catch (error) {
    logger.error("CRM reports error", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getReports };
