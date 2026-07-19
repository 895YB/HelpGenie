import { body } from 'express-validator';
import { handleValidationErrors } from './auth.validator.js';

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

// ── Company info ─────────────────────────────────────────────
export const validateUpdateCompany = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Company name must be 2–200 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('website')
    .optional({ nullable: true })
    .trim()
    .isURL({ require_protocol: true })
    .withMessage('Website must be a valid URL including http:// or https://'),

  body('phone')
    .optional({ nullable: true })
    .trim()
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Please provide a valid phone number'),

  body('industry')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Industry cannot exceed 100 characters'),

  handleValidationErrors,
];

// ── Theme ─────────────────────────────────────────────────────
export const validateUpdateTheme = [
  body('primaryColor')
    .optional()
    .matches(HEX_COLOR)
    .withMessage('primaryColor must be a valid hex color (e.g. #0ea5e9)'),

  body('secondaryColor')
    .optional()
    .matches(HEX_COLOR)
    .withMessage('secondaryColor must be a valid hex color'),

  body('accentColor')
    .optional()
    .matches(HEX_COLOR)
    .withMessage('accentColor must be a valid hex color'),

  body('fontFamily')
    .optional()
    .trim()
    .isIn(['Inter', 'Roboto', 'Open Sans', 'Poppins', 'Lato', 'Nunito', 'System'])
    .withMessage('Invalid font family'),

  body('borderRadius')
    .optional()
    .isIn(['rounded-none', 'rounded-sm', 'rounded', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full'])
    .withMessage('Invalid border radius value'),

  body('darkMode')
    .optional()
    .isBoolean()
    .withMessage('darkMode must be a boolean'),

  handleValidationErrors,
];

// ── Widget Settings ──────────────────────────────────────────
export const validateUpdateWidgetSettings = [
  body('greeting')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Greeting must be 1–200 characters'),

  body('placeholder')
    .optional()
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage('Placeholder must be 1–150 characters'),

  body('botName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Bot name must be 1–100 characters'),

  body('suggestedQuestions')
    .optional()
    .isArray({ max: 6 })
    .withMessage('You can have up to 6 suggested questions'),

  body('suggestedQuestions.*')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Each suggested question must be 3–200 characters'),

  body('showSources')
    .optional()
    .isBoolean()
    .withMessage('showSources must be a boolean'),

  body('allowFeedback')
    .optional()
    .isBoolean()
    .withMessage('allowFeedback must be a boolean'),

  body('allowEmailTranscript')
    .optional()
    .isBoolean()
    .withMessage('allowEmailTranscript must be a boolean'),

  body('position')
    .optional()
    .isIn(['bottom-right', 'bottom-left'])
    .withMessage('position must be bottom-right or bottom-left'),

  handleValidationErrors,
];

// ── Invite team member ───────────────────────────────────────
export const validateInviteTeamMember = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2–100 characters'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('role')
    .isIn(['admin', 'employee'])
    .withMessage('Role must be admin or employee'),

  handleValidationErrors,
];

// ── Update team member ───────────────────────────────────────
export const validateUpdateMember = [
  body('role')
    .optional()
    .isIn(['admin', 'employee'])
    .withMessage('Role must be admin or employee'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  handleValidationErrors,
];
