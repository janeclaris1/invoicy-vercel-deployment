const express = require("express");
const {
  getConnected,
  getAvailable,
  connect,
  disconnect,
  getApiKeys,
  createApiKey,
  deleteApiKey,
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
} = require("../controller/integrationController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/connected", getConnected);
router.get("/available", getAvailable);
router.post("/connect", connect);
router.post("/:id/disconnect", disconnect);

router.get("/api-keys", getApiKeys);
router.post("/api-keys", createApiKey);
router.delete("/api-keys/:id", deleteApiKey);

router.get("/webhooks", getWebhooks);
router.post("/webhooks", createWebhook);
router.patch("/webhooks/:id", updateWebhook);
router.delete("/webhooks/:id", deleteWebhook);

module.exports = router;
