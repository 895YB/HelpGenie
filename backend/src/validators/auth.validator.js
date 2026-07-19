import { body, validationResult } from 'express-validator';
import { AppError } from '../middleware/error.middleware.js';

/**
 * Converts express-validator errors into a single AppError
 * so the global error handler renders them uniformly.
 */
export function handleValidationErrors(req, _res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return next(AppError.badRequest('Validation failed', errors));
  }
  next();
}

// ── Reusable field validators ────────────────────────────────

const emailField = body('email')
  .trim()
  .isEmail()
  .withMessage('Please provide a valid email address')
  .normalizeEmail()
  .isLength({ max: 254 })
  .withMessage('Email is too long');

const passwordField = body('password')
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be between 8 and 128 characters')
  .matches(/[A-Z]/)
  .withMessage('Password must contain at least one uppercase letter')
  .matches(/[a-z]/)
  .withMessage('Password must contain at least one lowercase letter')
  .matches(/[0-9]/)
  .withMessage('Password must contain at least one number');

const nameField = body('name')
  .trim()
  .notEmpty()
  .withMessage('Name is required')
  .isLength({ min: 2, max: 100 })
  .withMessage('Name must be between 2 and 100 characters')
  .matches(/^[\p{L}\p{M}\s'-]+$/u)
  .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes');

// ── Validation chains ────────────────────────────────────────

export const validateRegister = [
  nameField,
  emailField,
  passwordField,
  body('companyName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Company name must be between 2 and 200 characters'),
  handleValidationErrors,
];

export const validateLogin = [
  emailField,
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

export const validateForgotPassword = [
  emailField,
  handleValidationErrors,
];

export const validateResetPassword = [
  passwordField,
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  handleValidationErrors,
];

export const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  passwordField.withMessage('New password must be between 8 and 128 characters'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  handleValidationErrors,
];

export const validateUpdateProfile = [
  nameField.optional(),
  emailField.optional(),
  handleValidationErrors,
];
