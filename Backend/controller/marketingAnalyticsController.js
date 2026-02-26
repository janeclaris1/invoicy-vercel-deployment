const Campaign = require("../models/Campaign");
const FormSubmission = require("../models/FormSubmission");
const Form = require("../models/Form");
const LandingPage = require("../models/LandingPage");
const logger = require("../utils/logger");

const getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const [campaignsSent, totalSubmissions, landingPageCount, recentCampaigns, recentSubmissions] = await Promise.all([
      Campaign.countDocuments({ user: userId, status: "sent" }),
      FormSubmission.countDocuments({ user: userId }),
      LandingPage.countDocuments({ user: userId, status: "published" }),
      Campaign.find({ user: userId }).sort({ sentAt: -1, updatedAt: -1 }).limit(10).select("name type status sentAt").lean(),
      FormSubmission.find({ user: userId }).sort({ submittedAt: -1 }).limit(10).populate("form", "name").lean(),
    ]);

    res.json({
      overview: {
        campaignsSent: campaignsSent,
        formSubmissions: totalSubmissions,
        publishedLandingPages: landingPageCount,
      },
      recentCampaigns: recentCampaigns.map((c) => ({
        _id: c._id,
        name: c.name,
        type: c.type,
        status: c.status,
        sentAt: c.sentAt,
      })),
      recentSubmissions: recentSubmissions.map((s) => ({
        _id: s._id,
        formName: s.form && s.form.name,
        data: s.data,
        submittedAt: s.submittedAt,
      })),
    });
  } catch (error) {
    logger.error("Get marketing analytics error", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getAnalytics };
