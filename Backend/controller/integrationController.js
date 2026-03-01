const Integration = require("../models/Integration");
const WebhookConfig = require("../models/WebhookConfig");
const ApiKey = require("../models/ApiKey");
const crypto = require("crypto");

const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || null;
const ALGO = "aes-256-gcm";

function encrypt(text) {
  if (!text) return null;
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) return text;
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY.slice(0, 32), "salt", 32);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let enc = cipher.update(text, "utf8", "hex") + cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + enc;
}

function decrypt(encrypted) {
  if (!encrypted) return null;
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) return encrypted;
  try {
    const [ivHex, tagHex, enc] = encrypted.split(":");
    if (!ivHex || !tagHex || !enc) return encrypted;
    const key = crypto.scryptSync(ENCRYPTION_KEY.slice(0, 32), "salt", 32);
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return decipher.update(enc, "hex", "utf8") + decipher.final("utf8");
  } catch (_) {
    return encrypted;
  }
}

const AVAILABLE = [
  { id: "quickbooks", name: "QuickBooks", category: "Accounting", icon: "📊", description: "Sync invoices and expenses" },
  { id: "xero", name: "Xero", category: "Accounting", icon: "📈", description: "Accounting and bookkeeping" },
  { id: "stripe", name: "Stripe", category: "Payments", icon: "💳", description: "Accept payments online" },
  { id: "paystack", name: "Paystack", category: "Payments", icon: "💰", description: "Payments for Africa" },
  { id: "gmail", name: "Gmail", category: "Email", icon: "📧", description: "Send invoices and reminders" },
  { id: "sendgrid", name: "SendGrid", category: "Email", icon: "✉️", description: "Transactional email" },
  { id: "slack", name: "Slack", category: "Communication", icon: "💬", description: "Notifications and alerts" },
  { id: "zapier", name: "Zapier", category: "Automation", icon: "⚡", description: "Connect 5000+ apps" },
  { id: "google-drive", name: "Google Drive", category: "Storage", icon: "📁", description: "Store and backup files" },
  { id: "hubspot", name: "HubSpot", category: "CRM", icon: "🎯", description: "Contacts and marketing" },
  { id: "whatsapp", name: "WhatsApp Business", category: "Communication", icon: "📱", description: "Chat and notifications" },
  { id: "gra", name: "GRA VAT", category: "Tax", icon: "🏛️", description: "Ghana Revenue Authority" },
];

exports.getConnected = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const list = await Integration.find({ user: userId, status: "active" })
      .select("-credentialEncrypted")
      .sort({ connectedAt: -1 })
      .lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load integrations" });
  }
};

exports.getAvailable = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const connected = await Integration.find({ user: userId, status: "active" })
      .select("provider")
      .lean();
    const connectedIds = new Set(connected.map((c) => c.provider));
    const list = AVAILABLE.map((a) => ({ ...a, connected: connectedIds.has(a.id) }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load available integrations" });
  }
};

exports.connect = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { provider, name, category, apiKey } = req.body || {};
    if (!provider || !provider.trim()) {
      return res.status(400).json({ message: "Provider is required" });
    }
    const prov = AVAILABLE.find((a) => a.id === provider);
    const doc = await Integration.findOne({ user: userId, provider: provider.trim() });
    if (doc && doc.status === "active") {
      return res.status(400).json({ message: "Already connected" });
    }
    const payload = {
      user: userId,
      provider: provider.trim(),
      name: name || (prov && prov.name) || provider,
      category: (prov && prov.category) || category || "",
      status: "active",
      connectedAt: new Date(),
    };
    if (apiKey && typeof apiKey === "string" && apiKey.trim()) {
      payload.credentialEncrypted = encrypt(apiKey.trim());
    }
    if (doc) {
      await Integration.updateOne({ _id: doc._id }, payload);
      const updated = await Integration.findById(doc._id).select("-credentialEncrypted").lean();
      return res.json(updated);
    }
    const created = await Integration.create(payload);
    const out = await Integration.findById(created._id).select("-credentialEncrypted").lean();
    res.status(201).json(out);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to connect" });
  }
};

exports.disconnect = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const doc = await Integration.findOne({ _id: id, user: userId });
    if (!doc) return res.status(404).json({ message: "Integration not found" });
    doc.status = "revoked";
    doc.credentialEncrypted = null;
    await doc.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to disconnect" });
  }
};

exports.getApiKeys = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const list = await ApiKey.find({ user: userId }).sort({ createdAt: -1 }).lean();
    const masked = list.map((k) => ({
      id: k._id,
      name: k.name,
      valueMasked: k.valueEncrypted ? "••••••••" : "",
      createdAt: k.createdAt,
    }));
    res.json(masked);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load API keys" });
  }
};

exports.createApiKey = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, value } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ message: "Name is required" });
    if (!value || typeof value !== "string") return res.status(400).json({ message: "Value is required" });
    const created = await ApiKey.create({
      user: userId,
      name: name.trim(),
      valueEncrypted: encrypt(value.trim()),
    });
    res.status(201).json({
      id: created._id,
      name: created.name,
      valueMasked: "••••••••",
      createdAt: created.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to save API key" });
  }
};

exports.deleteApiKey = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const doc = await ApiKey.findOne({ _id: id, user: userId });
    if (!doc) return res.status(404).json({ message: "API key not found" });
    await ApiKey.deleteOne({ _id: id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete" });
  }
};

exports.getWebhooks = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const list = await WebhookConfig.find({ user: userId }).sort({ createdAt: -1 }).lean();
    res.json(list.map((w) => ({ ...w, id: w._id })));
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load webhooks" });
  }
};

exports.createWebhook = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { url, description, events } = req.body || {};
    if (!url || !url.trim()) return res.status(400).json({ message: "URL is required" });
    const secret = crypto.randomBytes(24).toString("hex");
    const created = await WebhookConfig.create({
      user: userId,
      url: url.trim(),
      description: (description && description.trim()) || "",
      events: Array.isArray(events) ? events.filter((e) => typeof e === "string" && e.trim()) : [],
      secret,
      active: true,
    });
    const out = created.toObject();
    out.id = out._id;
    out.secret = secret;
    res.status(201).json(out);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to create webhook" });
  }
};

exports.updateWebhook = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const { url, description, events, active } = req.body || {};
    const doc = await WebhookConfig.findOne({ _id: id, user: userId });
    if (!doc) return res.status(404).json({ message: "Webhook not found" });
    if (url !== undefined) doc.url = url.trim();
    if (description !== undefined) doc.description = description.trim();
    if (events !== undefined) doc.events = Array.isArray(events) ? events.filter((e) => typeof e === "string" && e.trim()) : doc.events;
    if (typeof active === "boolean") doc.active = active;
    await doc.save();
    const out = doc.toObject();
    out.id = out._id;
    delete out.secret;
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to update webhook" });
  }
};

exports.deleteWebhook = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const doc = await WebhookConfig.findOne({ _id: id, user: userId });
    if (!doc) return res.status(404).json({ message: "Webhook not found" });
    await WebhookConfig.deleteOne({ _id: id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete webhook" });
  }
};
