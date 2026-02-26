const EmailTemplate = require("../models/EmailTemplate");
const logger = require("../utils/logger");

const getTemplates = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const templates = await EmailTemplate.find({ user: userId }).sort({ createdAt: -1 }).lean();
    res.json(templates);
  } catch (error) {
    logger.error("Get templates error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getTemplateById = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const template = await EmailTemplate.findOne({ _id: req.params.id, user: userId }).lean();
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json(template);
  } catch (error) {
    logger.error("Get template error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createTemplate = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, subject, body } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Template name is required" });
    const template = await EmailTemplate.create({
      user: userId,
      name: name.trim(),
      subject: subject || "",
      body: body || "",
    });
    res.status(201).json(template);
  } catch (error) {
    logger.error("Create template error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const template = await EmailTemplate.findOne({ _id: req.params.id, user: userId });
    if (!template) return res.status(404).json({ message: "Template not found" });
    const { name, subject, body } = req.body;
    if (name !== undefined) template.name = name.trim();
    if (subject !== undefined) template.subject = subject;
    if (body !== undefined) template.body = body;
    await template.save();
    res.json(template);
  } catch (error) {
    logger.error("Update template error", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const template = await EmailTemplate.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json({ message: "Template deleted" });
  } catch (error) {
    logger.error("Delete template error", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Seed a set of default templates for the current user, if they don't already have any.
const seedDefaultTemplates = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const existingCount = await EmailTemplate.countDocuments({ user: userId });
    if (existingCount > 0) {
      return res.status(200).json({ message: "Templates already exist for this user, skipping seed." });
    }

    const defaults = [
      {
        name: "Product sale",
        subject: "🔥 [X]% off [Product Name] until [End Date]",
        body:
          "Hi [First name],\n\n" +
          "Great news — we’re running a limited-time offer on [Product Name].\n\n" +
          "From [Start date] to [End date], you can get [X]% off when you [shop/book/order] online.\n\n" +
          "Why customers love [Product Name]:\n" +
          "- [Benefit 1]\n" +
          "- [Benefit 2]\n" +
          "- [Benefit 3]\n\n" +
          "Use code: [DISCOUNT_CODE] at checkout.\n\n" +
          "👉 [Shop now button link]\n\n" +
          "Hurry, this offer ends on [End date].\n\n" +
          "Best,\n" +
          "[Your company name]\n",
      },
      {
        name: "Product launch",
        subject: "Introducing [Product Name] – now available",
        body:
          "Hi [First name],\n\n" +
          "We’re excited to introduce [Product Name], designed to help you [key outcome].\n\n" +
          "Here’s what you can do with [Product Name]:\n" +
          "- [Feature 1] – [short benefit]\n" +
          "- [Feature 2] – [short benefit]\n" +
          "- [Feature 3] – [short benefit]\n\n" +
          "Be among the first to try it and get [early-bird bonus/intro price] until [date].\n\n" +
          "👉 Learn more & get started: [Product page link]\n\n" +
          "Thanks for being part of our journey,\n" +
          "[Your company name]\n",
      },
      {
        name: "Re-engagement",
        subject: "We miss you, [First name] – here’s [X]% off to come back",
        body:
          "Hi [First name],\n\n" +
          "It’s been a while since we last saw you at [Your app/store].\n\n" +
          "To welcome you back, here’s a [X]% discount on your next purchase/subscription.\n\n" +
          "Use code: [REENGAGE_CODE] before [expiry date].\n\n" +
          "Since you left, we’ve:\n" +
          "- Added [new feature/update]\n" +
          "- Improved [area]\n" +
          "- Launched [new product/service]\n\n" +
          "👉 Come back and explore: [Login/Shop link]\n\n" +
          "Hope to see you soon,\n" +
          "[Your company name]\n",
      },
      {
        name: "Onboarding & welcome",
        subject: "Welcome to [Product Name], [First name]",
        body:
          "Hi [First name],\n\n" +
          "Welcome to [Product Name] — we’re glad to have you!\n\n" +
          "Here are your first 3 steps to get value fast:\n" +
          "1. Complete your profile: [Profile link]\n" +
          "2. Set up [key setting/integration]: [Setup link]\n" +
          "3. Create your first [invoice/project/campaign]: [Action link]\n\n" +
          "Helpful resources:\n" +
          "- Quick start guide: [Link]\n" +
          "- Video walkthrough: [Link]\n" +
          "- Support center: [Link]\n\n" +
          "If you need help, just reply to this email.\n\n" +
          "Cheers,\n" +
          "[Your name]\n" +
          "[Title], [Company]\n",
      },
      {
        name: "Online event promotion",
        subject: "You’re invited: [Event Title] on [Date]",
        body:
          "Hi [First name],\n\n" +
          "You’re invited to our live online event [Event Title] on [Date, Time, Timezone].\n\n" +
          "In this session, you’ll learn:\n" +
          "- [Point 1]\n" +
          "- [Point 2]\n" +
          "- [Point 3]\n\n" +
          "🎥 Format: [Webinar / Live demo / Q&A]\n" +
          "⏱ Duration: [X] minutes\n" +
          "💻 Location: Online – link sent after registration\n\n" +
          "👉 Reserve your spot: [Registration link]\n\n" +
          "Seats are limited, so make sure to register before [deadline].\n\n" +
          "See you there,\n" +
          "[Your company name]\n",
      },
      {
        name: "Lead generation",
        subject: "Get your free [Guide/Template/Checklist]: [Title]",
        body:
          "Hi [First name],\n\n" +
          "We’ve created a free [type of resource] to help you [achieve outcome]:\n\n" +
          "\"[Resource Title]\"\n\n" +
          "Inside, you’ll find:\n" +
          "- [Key insight 1]\n" +
          "- [Key insight 2]\n" +
          "- [Key insight 3]\n\n" +
          "👉 Download your free copy here: [Download link]\n\n" +
          "No fluff, just practical value you can use today.\n\n" +
          "Best,\n" +
          "[Your company name]\n",
      },
      {
        name: "In-person event promotion",
        subject: "Join us in [City] for [Event Name] on [Date]",
        body:
          "Hi [First name],\n\n" +
          "We’re hosting [Event Name] in [City] on [Date], and we’d love for you to join us.\n\n" +
          "Event details:\n" +
          "- 📍 Venue: [Venue name + address]\n" +
          "- 🕒 Time: [Start–End time]\n" +
          "- 🎯 Who it’s for: [Target audience]\n" +
          "- 📝 You’ll learn: [Key topics]\n\n" +
          "👉 Save your seat: [Registration link]\n\n" +
          "Early-bird tickets are available until [date].\n" +
          "We hope to meet you in person!\n\n" +
          "Regards,\n" +
          "[Your company name]\n",
      },
      {
        name: "Abandoned cart",
        subject: "You left something behind",
        body:
          "Hi [First name],\n\n" +
          "We noticed you started an order but didn’t complete it.\n\n" +
          "In your cart:\n" +
          "- [Product 1] – [price]\n" +
          "- [Product 2] – [price]\n\n" +
          "👉 Resume your checkout here: [Cart link]\n\n" +
          "Complete your order before [date] and get [X]% off with code: [CART_CODE].\n\n" +
          "If you have any questions or issues with checkout, just reply to this email.\n\n" +
          "Best,\n" +
          "[Your company name]\n",
      },
    ];

    const docs = defaults.map((tpl) => ({
      user: userId,
      name: tpl.name,
      subject: tpl.subject,
      body: tpl.body,
    }));

    const created = await EmailTemplate.insertMany(docs);
    res.status(201).json({ message: "Default templates seeded", count: created.length });
  } catch (error) {
    logger.error("Seed default templates error", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate, seedDefaultTemplates };
