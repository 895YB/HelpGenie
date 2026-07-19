import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getTheme,
  updateTheme,
  getWidgetSettings,
  updateWidgetSettings,
} from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireTenant } from '../middleware/tenant.middleware.js';
import { requireAdmin, requireAdminOrEmployee } from '../middleware/role.middleware.js';
import {
  validateUpdateCompany,
  validateUpdateTheme,
  validateUpdateWidgetSettings,
} from '../validators/company.validator.js';

const router = Router();

router.use(authenticate, requireTenant);

// Aggregate: company info + theme + widget settings + subscription summary
router.get('/', requireAdminOrEmployee, getSettings);
router.put('/', requireAdmin, validateUpdateCompany, updateSettings);

router.get('/theme', requireAdminOrEmployee, getTheme);
router.put('/theme', requireAdmin, validateUpdateTheme, updateTheme);

router.get('/widget', requireAdminOrEmployee, getWidgetSettings);
router.put('/widget', requireAdmin, validateUpdateWidgetSettings, updateWidgetSettings);

export default router;
