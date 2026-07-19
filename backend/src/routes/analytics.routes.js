import { Router } from 'express';
import {
  getOverview,
  getDailyChats,
  getHourlyDistribution,
  getSatisfactionTrend,
  getTokenUsage,
  getDocumentUsage,
  getRecentFeedback,
  exportCsv,
} from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireTenant } from '../middleware/tenant.middleware.js';
import { requireAdminOrEmployee } from '../middleware/role.middleware.js';
import { query } from 'express-validator';
import { handleValidationErrors } from '../validators/auth.validator.js';

const router = Router();

// All analytics routes require auth + tenant context
router.use(authenticate, requireTenant, requireAdminOrEmployee);

// Shared date range validation
const dateRange = [
  query('from').optional().isISO8601().withMessage('from must be a valid date (YYYY-MM-DD)').toDate(),
  query('to').optional().isISO8601().withMessage('to must be a valid date (YYYY-MM-DD)').toDate(),
  handleValidationErrors,
];

router.get('/overview',      dateRange, getOverview);
router.get('/chats/daily',   dateRange, getDailyChats);
router.get('/chats/hourly',  dateRange, getHourlyDistribution);
router.get('/satisfaction',  dateRange, getSatisfactionTrend);
router.get('/tokens',        dateRange, getTokenUsage);
router.get('/documents',     dateRange, getDocumentUsage);
router.get('/feedback',      getRecentFeedback);
router.get('/export',        dateRange, exportCsv);

export default router;
