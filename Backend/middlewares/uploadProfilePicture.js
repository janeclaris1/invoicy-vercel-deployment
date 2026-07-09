const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { getWritableDir } = require('../utils/runtimePaths');

const UPLOAD_DIR = getWritableDir('uploads/profiles');
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, `${name}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF and WebP images are allowed'), false);
  }
};

const uploadProfilePicture = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('photo');

module.exports = uploadProfilePicture;
module.exports.UPLOAD_DIR = UPLOAD_DIR;
