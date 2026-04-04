const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/db");
const errorHandler = require("./middlewares/errorHandler");
const { apiLimiter, authLimiter, aiLimiter, messagingLimiter } = require("./middlewares/rateLimiter");
const logger = require("./utils/logger");

const authRoutes = require("./routes/authRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const itemRoutes = require("./routes/itemRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRequestRoutes = require("./routes/leaveRequestRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const salaryRoutes = require("./routes/salaryRoutes");
const aiRoutes = require("./routes/aiRoutes");
const onboardingOffboardingRoutes = require("./routes/onboardingOffboardingRoutes");
const performanceTalentRoutes = require("./routes/performanceTalentRoutes");
const recruitmentRoutes = require("./routes/recruitmentRoutes");
const messagingRoutes = require("./routes/messagingRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const graRoutes = require("./routes/graRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const landingPageRoutes = require("./routes/landingPageRoutes");
const workflowRoutes = require("./routes/workflowRoutes");
const marketingListRoutes = require("./routes/marketingListRoutes");
const formRoutes = require("./routes/formRoutes");
const emailTemplateRoutes = require("./routes/emailTemplateRoutes");
const marketingAnalyticsRoutes = require("./routes/marketingAnalyticsRoutes");
const contactRoutes = require("./routes/contactRoutes");
const companyRoutes = require("./routes/companyRoutes");
const leadRoutes = require("./routes/leadRoutes");
const dealRoutes = require("./routes/dealRoutes");
const activityRoutes = require("./routes/activityRoutes");
const crmReportsRoutes = require("./routes/crmReportsRoutes");
const integrationRoutes = require("./routes/integrationRoutes");
const accountingRoutes = require("./routes/accountingRoutes");
const branchRoutes = require("./routes/branchRoutes");
const auditRoutes = require("./routes/auditRoutes");
const permissionRoutes = require("./routes/permissionRoutes");
const customFieldsRoutes = require("./routes/customFieldsRoutes");
const documentRoutes = require("./routes/documentRoutes");
const projectRoutes = require("./routes/projectRoutes");
const productionRoutes = require("./routes/productionRoutes");
const supplyChainRoutes = require("./routes/supplyChainRoutes");
const sectionNoteRoutes = require("./routes/sectionNoteRoutes");
const { attachAudit } = require("./middlewares/auditMiddleware");
const { jsonBodyParser, urlencodedBodyParser } = require("./middlewares/bodyParserByRoute");
const { webhook: subscriptionWebhook } = require("./controller/subscriptionController");

const app = express();

// Render / other reverse proxies (needed for correct client IP and secure cookies behind HTTPS)
app.set("trust proxy", 1);

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration
const isProduction = process.env.NODE_ENV === 'production';
const prodOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean) : [];
const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
// Vercel preview URLs: opt-in when ALLOWED_ORIGINS is not set (set ALLOW_VERCEL_PREVIEW_ORIGINS=1)
const isVercelPreviewOrigin = (origin) => typeof origin === 'string' && /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);
const allowVercelPreviewOrigins =
  process.env.ALLOW_VERCEL_PREVIEW_ORIGINS === 'true' || process.env.ALLOW_VERCEL_PREVIEW_ORIGINS === '1';

app.use(cors({
  origin: function (origin, callback) {
    // No Origin: native apps, curl, Postman, same-origin navigation
    if (!origin) return callback(null, true);
    // Development: allow any browser origin (LAN, alternate ports); production uses allowlist below
    if (!isProduction) {
      return callback(null, true);
    }
    // Production: require explicit allowlist, or Vercel previews when explicitly enabled
    if (prodOrigins.indexOf(origin) !== -1) return callback(null, true);
    if (allowVercelPreviewOrigins && isVercelPreviewOrigin(origin)) return callback(null, true);
    if (prodOrigins.length === 0) {
      logger.warn(`CORS blocked: ALLOWED_ORIGINS is empty. Set ALLOWED_ORIGINS or ALLOW_VERCEL_PREVIEW_ORIGINS=1. Origin: ${origin}`);
    } else {
      logger.warn(`CORS rejected origin: ${origin}. Add it to ALLOWED_ORIGINS.`);
    }
    const err = new Error('Not allowed by CORS');
    err.statusCode = 403;
    callback(err);
  },
  credentials: true,
  // Include OPTIONS so browsers’ CORS preflight succeeds; omitting it can break cross-origin requests.
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Request Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Rate Limiting
app.use('/api/', apiLimiter);

// Connect to Database
const connectDatabase = async () => {
  try {
    await connectDB();
  } catch (err) {
    logger.error('Database connection error:', err);
    // In production, exit if database connection fails
    if (process.env.NODE_ENV === 'production') {
      logger.error('Exiting due to database connection failure in production');
      process.exit(1);
    }
  }
};
connectDatabase();

// Production secrets and CORS configuration
if (isProduction) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || String(jwtSecret).length < 32) {
    logger.error("FATAL: JWT_SECRET must be set and at least 32 characters in production.");
    process.exit(1);
  }
  if (prodOrigins.length === 0 && !allowVercelPreviewOrigins) {
    logger.warn(
      "ALLOWED_ORIGINS is empty — browser requests that send an Origin header will be rejected by CORS. " +
        "Set ALLOWED_ORIGINS to your frontend URL(s), or ALLOW_VERCEL_PREVIEW_ORIGINS=1 for *.vercel.app previews."
    );
  }
}

// Log whether platform admin is configured (so you can verify .env is loaded)
const _adminCount = (process.env.PLATFORM_ADMIN_EMAIL || '').split(',').filter((e) => e.trim()).length;
if (_adminCount > 0) {
  logger.info(`Platform admin: ${_adminCount} email(s) configured (Subscribed clients will show for that user).`);
} else {
  logger.warn('Platform admin: PLATFORM_ADMIN_EMAIL not set or empty - no one will see "Subscribed clients".');
}

// Paystack webhook must receive raw body for signature verification (before express.json)
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body;
  next();
}, subscriptionWebhook);

// JSON: 1mb default (DoS hardening); 10mb only for /api/items, /api/invoices, PUT /api/auth/me
app.use(jsonBodyParser);
app.use(urlencodedBodyParser);
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// Attach audit logger to req (req.auditLog({ action, resource, resourceId, changes }))
app.use(attachAudit);

// Health check endpoint (no internal details in production)
app.get('/api/health', (req, res) => {
  const payload = {
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  };
  if (!isProduction) {
    payload.environment = process.env.NODE_ENV || 'development';
  }
  res.status(200).json(payload);
});

// OpenAPI / Swagger — off in production unless SWAGGER_ENABLED=true (reduces API surface exposure)
const swaggerEnabled =
  !isProduction ||
  process.env.SWAGGER_ENABLED === 'true' ||
  process.env.SWAGGER_ENABLED === '1';
if (swaggerEnabled) {
  try {
    const { serveSwagger, setupSwagger } = require("./config/swagger");
    app.use("/api-docs", serveSwagger, setupSwagger);
    logger.info("Swagger UI available at /api-docs");
  } catch (e) {
    const swaggerErr = e && (e.stack || e.message) ? (e.stack || e.message) : String(e);
    logger.warn("Swagger not loaded: " + swaggerErr);
  }
} else {
  logger.info("Swagger UI disabled in production (set SWAGGER_ENABLED=true to enable).");
}

// Define Routes Here
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave-requests", leaveRequestRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/salaries", salaryRoutes);
app.use("/api/hr-tasks", onboardingOffboardingRoutes);
app.use("/api/hr-performance", performanceTalentRoutes);
app.use("/api/hr-recruitment", recruitmentRoutes);
app.use("/api/messages", messagingLimiter, messagingRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);
app.use("/api/subscriptions", authLimiter, subscriptionRoutes);
app.use("/api/gra", authLimiter, graRoutes);
app.use("/api/marketing/campaigns", authLimiter, campaignRoutes);
app.use("/api/marketing/landing-pages", authLimiter, landingPageRoutes);
app.use("/api/marketing/workflows", authLimiter, workflowRoutes);
app.use("/api/marketing/lists", authLimiter, marketingListRoutes);
app.use("/api/marketing/forms", authLimiter, formRoutes);
app.use("/api/marketing/templates", authLimiter, emailTemplateRoutes);
app.use("/api/marketing/analytics", authLimiter, marketingAnalyticsRoutes);
app.use("/api/crm/contacts", authLimiter, contactRoutes);
app.use("/api/crm/companies", authLimiter, companyRoutes);
app.use("/api/crm/leads", authLimiter, leadRoutes);
app.use("/api/crm/deals", authLimiter, dealRoutes);
app.use("/api/crm/activities", authLimiter, activityRoutes);
app.use("/api/crm/reports", authLimiter, crmReportsRoutes);
app.use("/api/integrations", authLimiter, integrationRoutes);
app.use("/api/accounting", authLimiter, accountingRoutes);
app.use("/api/branches", authLimiter, branchRoutes);
app.use("/api/audit-logs", authLimiter, auditRoutes);
app.use("/api/erp", authLimiter, permissionRoutes);
app.use("/api/custom-fields", authLimiter, customFieldsRoutes);
app.use("/api/documents", authLimiter, documentRoutes);
app.use("/api/projects", authLimiter, projectRoutes);
app.use("/api/production", authLimiter, productionRoutes);
app.use("/api/supply-chain", authLimiter, supplyChainRoutes);
app.use("/api/section-notes", authLimiter, sectionNoteRoutes);

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global Error Handler (must be last)
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', err);
  if (process.env.NODE_ENV === 'production') {
    // Close server gracefully
    server.close(() => {
      process.exit(1);
    });
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});