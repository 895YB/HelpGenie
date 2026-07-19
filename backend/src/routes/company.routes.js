import { Router } from 'express';
import {
  getCompany,
  updateCompany,
  uploadLogo,
  getApiKey,
  regenerateApiKey,
  getEmbedCode,
  getSubscription,
  getWidgetConfig,
} from '../controllers/company.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireTenant, resolveWidgetTenant } from '../middleware/tenant.middleware.js';
import { requireAdmin, requireAdminOrEmployee } from '../middleware/role.middleware.js';
import { uploadImage } from '../middleware/upload.middleware.js';
import { uploadLimiter, chatLimiter } from '../middleware/rateLimit.middleware.js';
import { validateUpdateCompany } from '../validators/company.validator.js';

const router = Router();

// ── Public widget route (no JWT) — must precede the auth block below ──
router.get('/widget-config', chatLimiter, resolveWidgetTenant, getWidgetConfig);

// All remaining company routes require authentication + tenant context
router.use(authenticate, requireTenant);

router.get('/', requireAdminOrEmployee, getCompany);
router.put('/', requireAdmin, validateUpdateCompany, updateCompany);

router.post('/logo', requireAdmin, uploadLimiter, uploadImage, uploadLogo);

// API key is sensitive — admin only, returns the +apiKey field
router.get('/api-key',            requireAdmin, getApiKey);
router.post('/api-key/regenerate', requireAdmin, regenerateApiKey);

router.get('/embed-code', requireAdminOrEmployee, getEmbedCode);
router.get('/subscription', requireAdmin, getSubscription);

export default router;
