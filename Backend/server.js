require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
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

// Middleware to parse JSON (allow larger payloads e.g. base64 images)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

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