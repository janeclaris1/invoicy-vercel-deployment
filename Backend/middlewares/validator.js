const { body, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Common validation rules
const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors,
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

const validateInvoice = [
  body('invoiceDate')
    .isISO8601()
    .withMessage('Invalid invoice date'),
  body('dueDate')
    .isISO8601()
    .withMessage('Invalid due date'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Invoice must contain at least one item'),
  body('items.*.description')
    .trim()
    .notEmpty()
    .withMessage('Item description is required'),
  body('items.*.quantity')
    .isFloat({ min: 0.01 })
    .withMessage('Item quantity must be greater than 0'),
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Item unit price must be greater than or equal to 0'),
  handleValidationErrors,
];

// Update allows partial payloads (e.g. only amountPaid, or only GRA fields). Validate only if present.
const validateInvoiceUpdate = [
  body('invoiceDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid invoice date'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid due date'),
  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Invoice must contain at least one item'),
  body('items.*.description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Item description is required'),
  body('items.*.quantity')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Item quantity must be greater than 0'),
  body('items.*.unitPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Item unit price must be greater than or equal to 0'),
  body('amountPaid')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount paid must be 0 or greater'),
  body('grandTotal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Grand total must be 0 or greater'),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateInvoice,
  validateInvoiceUpdate,
};
