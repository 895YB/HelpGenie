import { Router } from 'express';
import {
  sendMessage,
  submitFeedback,
  emailTranscript,
  getSessionHistory,
  listConversations,
  getConversationDetails,
  closeConversation,
} from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdminOrEmployee } from '../middleware/role.middleware.js';
import { requireTenant, resolveWidgetTenant } from '../middleware/tenant.middleware.js';
import { chatLimiter } from '../middleware/rateLimit.middleware.js';
import {
  validateChatMessage,
  validateFeedback,
  validateTranscript,
  validateSessionHistory,
  validateListConversations,
} from '../validators/chat.validator.js';

const router = Router();

// ── Public widget routes (no JWT) ─────────────────────────────
router.post(
  '/',
  chatLimiter,
  validateChatMessage,
  resolveWidgetTenant,
  sendMessage
);

router.post(
  '/feedback/:messageId',
  chatLimiter,
  validateFeedback,
  submitFeedback
);

router.post(
  '/transcript',
  chatLimiter,
  validateTranscript,
  resolveWidgetTenant,
  emailTranscript
);

router.get(
  '/history',
  chatLimiter,
  validateSessionHistory,
  resolveWidgetTenant,
  getSessionHistory
);

// ── Dashboard routes (JWT + tenant required) ──────────────────
router.get(
  '/conversations',
  authenticate,
  requireTenant,
  requireAdminOrEmployee,
  validateListConversations,
  listConversations
);

router.get(
  '/conversations/:id',
  authenticate,
  requireTenant,
  requireAdminOrEmployee,
  getConversationDetails
);

router.delete(
  '/conversations/:id',
  authenticate,
  requireTenant,
  requireAdminOrEmployee,
  closeConversation
);

export default router;
