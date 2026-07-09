const path = require("path");
const fs = require("fs");

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const getWritableDir = (relativePath) => {
  const dir = isServerless
    ? path.join("/tmp", "aiinvoice", relativePath)
    : path.join(__dirname, "..", relativePath);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (_) {
    /* ignore on read-only filesystem */
  }

  return dir;
};

module.exports = { isServerless, getWritableDir };
