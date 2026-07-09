let app;

try {
  app = require("../Backend/server");
} catch (error) {
  console.error("Failed to load backend server:", error);
  module.exports = (req, res) => {
    res.status(500).json({
      success: false,
      message: "API failed to start",
      error: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  };
}

if (app) {
  module.exports = app;
}
