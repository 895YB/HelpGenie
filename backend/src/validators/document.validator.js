import { body, query } from 'express-validator';
import { handleValidationErrors } from './auth.validator.js';

export const validateUrlIngest = [
  body('url')
    .trim()
    .notEmpty()
    .withMessage('URL is required')
    .isURL({ require_protocol: true, protocols: ['http', 'https'] })
    .withMessage('Must be a valid URL starting with http:// or https://')
    .isLength({ max: 2048 })
    .withMessage('URL is too long'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Name must be 1–500 characters'),

  handleValidationErrors,
];

export const validateListDocuments = [
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'ready', 'failed'])
    .withMessage('status must be one of: pending, processing, ready, failed'),

  query('fileType')
    .optional()
    .isIn(['pdf', 'docx', 'txt', 'url'])
    .withMessage('fileType must be one of: pdf, docx, txt, url'),

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

  handleValidationErrors,
];

export const validateFileName = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Name must be 1–500 characters'),

  handleValidationErrors,
];
