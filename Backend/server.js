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
const { attachAudit } = require("./middlewares/auditMiddleware");
const { webhook: subscriptionWebhook } = require("./controller/subscriptionController");

const app = express();

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

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman, curl, same-origin
    if (!isProduction) {
      if (isLocalOrigin(origin)) return callback(null, true);
    }
    if (prodOrigins.indexOf(origin) !== -1) return callback(null, true);
    if (isProduction && prodOrigins.length === 0 && isLocalOrigin(origin)) return callback(null, true);
    logger.warn(`CORS rejected origin: ${origin}. Add it to ALLOWED_ORIGINS on Render.`);
    const err = new Error('Not allowed by CORS');
    err.statusCode = 403;
    callback(err);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
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

// Middleware to parse JSON (allow larger payloads e.g. base64 images)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// Attach audit logger to req (req.auditLog({ action, resource, resourceId, changes }))
app.use(attachAudit);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// OpenAPI / Swagger documentation (ERP API)
try {
  const { serveSwagger, setupSwagger } = require("./config/swagger");
  app.use("/api-docs", serveSwagger, setupSwagger);
  logger.info("Swagger UI available at /api-docs");
} catch (e) {
  logger.warn("Swagger not loaded:", e.message);
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