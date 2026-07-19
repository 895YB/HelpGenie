import { Router } from 'express';
import {
  uploadDocument,
  ingestUrl,
  listDocuments,
  getDocument,
  getDocumentStats,
  getDocumentChunks,
  deleteDocument,
  retryDocument,
} from '../controllers/document.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireTenant } from '../middleware/tenant.middleware.js';
import { requireAdmin, requireAdminOrEmployee } from '../middleware/role.middleware.js';
import { uploadDocument as multerUpload } from '../middleware/upload.middleware.js';
import { uploadLimiter } from '../middleware/rateLimit.middleware.js';
import {
  validateUrlIngest,
  validateListDocuments,
  validateFileName,
} from '../validators/document.validator.js';

const router = Router();

// All document routes require auth + tenant context
router.use(authenticate, requireTenant);

// ── Knowledge base stats (dashboard overview card) ───────────
router.get('/stats', requireAdminOrEmployee, getDocumentStats);

// ── List + upload ────────────────────────────────────────────
router.get(
  '/',
  requireAdminOrEmployee,
  validateListDocuments,
  listDocuments
);

router.post(
  '/upload',
  requireAdmin,
  uploadLimiter,
  multerUpload,
  validateFileName,
  uploadDocument
);

router.post(
  '/url',
  requireAdmin,
  uploadLimiter,
  validateUrlIngest,
  ingestUrl
);

// ── Single document ──────────────────────────────────────────
router.get('/:id',        requireAdminOrEmployee, getDocument);
router.delete('/:id',     requireAdmin,           deleteDocument);
router.post('/:id/retry', requireAdmin,           retryDocument);

// ── Chunks (knowledge base detail view) ─────────────────────
router.get('/:id/chunks', requireAdminOrEmployee, getDocumentChunks);

export default router;
