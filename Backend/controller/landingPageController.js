const LandingPage = require("../models/LandingPage");
const logger = require("../utils/logger");

const slugify = (s) =>
  String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

const getLandingPages = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const pages = await LandingPage.find({ user: userId }).sort({ createdAt: -1 }).lean();
    res.json(pages);
  } catch (error) {
    logger.error("Get landing pages error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getLandingPageById = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const page = await LandingPage.findOne({ _id: req.params.id, user: userId }).lean();
    if (!page) return res.status(404).json({ message: "Landing page not found" });
    res.json(page);
  } catch (error) {
    logger.error("Get landing page error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createLandingPage = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { title, slug, content, template, metaTitle, metaDescription } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: "Title is required" });
    const finalSlug = (slug && slug.trim()) ? slugify(slug) : slugify(title);
    const existing = await LandingPage.findOne({ user: userId, slug: finalSlug });
    if (existing) return res.status(400).json({ message: "A page with this slug already exists" });
    const page = await LandingPage.create({
      user: userId,
      title: title.trim(),
      slug: finalSlug,
      content: content || "",
      template: template || "default",
      metaTitle: metaTitle || "",
      metaDescription: metaDescription || "",
    });
    res.status(201).json(page);
  } catch (error) {
    logger.error("Create landing page error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateLandingPage = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const page = await LandingPage.findOne({ _id: req.params.id, user: userId });
    if (!page) return res.status(404).json({ message: "Landing page not found" });
    const { title, slug, content, template, status, metaTitle, metaDescription } = req.body;
    if (title !== undefined) page.title = title.trim();
    if (slug !== undefined) page.slug = slugify(slug);
    if (content !== undefined) page.content = content;
    if (template !== undefined) page.template = template;
    if (status !== undefined && ["draft", "published"].includes(status)) page.status = status;
    if (metaTitle !== undefined) page.metaTitle = metaTitle;
    if (metaDescription !== undefined) page.metaDescription = metaDescription;
    await page.save();
    res.json(page);
  } catch (error) {
    logger.error("Update landing page error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteLandingPage = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const page = await LandingPage.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!page) return res.status(404).json({ message: "Landing page not found" });
    res.json({ message: "Landing page deleted" });
  } catch (error) {
    logger.error("Delete landing page error", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getLandingPages,
  getLandingPageById,
  createLandingPage,
  updateLandingPage,
  deleteLandingPage,
};
