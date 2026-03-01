const multer = require('multer');

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const allowedMimes = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const ok = allowedMimes.includes(file.mimetype) ||
    file.originalname.toLowerCase().endsWith('.csv') ||
    file.originalname.toLowerCase().endsWith('.xlsx') ||
    file.originalname.toLowerCase().endsWith('.xls');
  if (ok) cb(null, true);
  else cb(new Error('Only CSV or Excel files are allowed'), false);
};

const uploadItemsFile = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('file');

module.exports = uploadItemsFile;
