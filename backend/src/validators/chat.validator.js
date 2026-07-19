import { body, query } from 'express-validator';
import { handleValidationErrors } from './auth.validator.js';

export const validateChatMessage = [
  body('widgetId')
    .trim()
    .notEmpty()
    .withMessage('widgetId is required'),

  body('question')
    .trim()
    .notEmpty()
    .withMessage('Question is required')
    .isLength({ max: 2000 })
    .withMessage('Question must be 2000 characters or fewer'),

  body('sessionId')
    .optional()
    .isString()
    .trim(),

  body('customerEmail')
    .optional()
    .isEmail()
    .withMessage('customerEmail must be a valid email')
    .normalizeEmail(),

  body('customerName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('customerName must be 100 characters or fewer'),

  handleValidationErrors,
];

export const validateFeedback = [
  body('sessionId')
    .trim()
    .notEmpty()
    .withMessage('sessionId is required'),

  body('rating')
    .isIn(['thumbs_up', 'thumbs_down'])
    .withMessage('rating must be thumbs_up or thumbs_down'),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('comment must be 1000 characters or fewer'),

  handleValidationErrors,
];

export const validateTranscript = [
  body('sessionId')
    .trim()
    .notEmpty()
    .withMessage('sessionId is required'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('email is required')
    .isEmail()
    .withMessage('email must be a valid email address')
    .normalizeEmail(),

  handleValidationErrors,
];

export const validateSessionHistory = [
  query('widgetId')
    .trim()
    .notEmpty()
    .withMessage('widgetId is required'),

  query('sessionId')
    .trim()
    .notEmpty()
    .withMessage('sessionId is required'),

  handleValidationErrors,
];

export const validateListConversations = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
    .toInt(),

  query('status')
    .optional()
    .isIn(['active', 'closed'])
    .withMessage('status must be active or closed'),

  handleValidationErrors,
];
