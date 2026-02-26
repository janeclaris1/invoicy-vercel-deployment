const Form = require("../models/Form");
const FormSubmission = require("../models/FormSubmission");
const logger = require("../utils/logger");

const getForms = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const forms = await Form.find({ user: userId }).sort({ createdAt: -1 }).lean();
    res.json(forms);
  } catch (error) {
    logger.error("Get forms error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getFormById = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const form = await Form.findOne({ _id: req.params.id, user: userId }).lean();
    if (!form) return res.status(404).json({ message: "Form not found" });
    res.json(form);
  } catch (error) {
    logger.error("Get form error", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** Public: get form by id for embedding (no auth required but form must exist) */
const getFormPublic = async (req, res) => {
  try {
    const form = await Form.findById(req.params.id).select("name fields submitButtonText").lean();
    if (!form) return res.status(404).json({ message: "Form not found" });
    res.json(form);
  } catch (error) {
    logger.error("Get form public error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createForm = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, fields, submitButtonText, redirectUrl, listId } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Form name is required" });
    const form = await Form.create({
      user: userId,
      name: name.trim(),
      fields: Array.isArray(fields) ? fields : [],
      submitButtonText: submitButtonText || "Submit",
      redirectUrl: redirectUrl || "",
      listId: listId || null,
    });
    res.status(201).json(form);
  } catch (error) {
    logger.error("Create form error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateForm = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const form = await Form.findOne({ _id: req.params.id, user: userId });
    if (!form) return res.status(404).json({ message: "Form not found" });
    const { name, fields, submitButtonText, redirectUrl, listId } = req.body;
    if (name !== undefined) form.name = name.trim();
    if (fields !== undefined && Array.isArray(fields)) form.fields = fields;
    if (submitButtonText !== undefined) form.submitButtonText = submitButtonText;
    if (redirectUrl !== undefined) form.redirectUrl = redirectUrl;
    if (listId !== undefined) form.listId = listId;
    await form.save();
    res.json(form);
  } catch (error) {
    logger.error("Update form error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteForm = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const form = await Form.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!form) return res.status(404).json({ message: "Form not found" });
    await FormSubmission.deleteMany({ form: form._id });
    res.json({ message: "Form deleted" });
  } catch (error) {
    logger.error("Delete form error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getSubmissions = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const form = await Form.findOne({ _id: req.params.id, user: userId });
    if (!form) return res.status(404).json({ message: "Form not found" });
    const submissions = await FormSubmission.find({ form: form._id }).sort({ submittedAt: -1 }).limit(500).lean();
    res.json(submissions);
  } catch (error) {
    logger.error("Get submissions error", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** Public form submit (no auth) */
const submitForm = async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ message: "Form not found" });
    const { data, source } = req.body;
    await FormSubmission.create({
      form: form._id,
      user: form.user,
      data: data || {},
      source: source || "",
    });
    res.status(201).json({ message: "Thank you for submitting", redirectUrl: form.redirectUrl || null });
  } catch (error) {
    logger.error("Submit form error", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getForms,
  getFormById,
  getFormPublic,
  createForm,
  updateForm,
  deleteForm,
  getSubmissions,
  submitForm,
};
