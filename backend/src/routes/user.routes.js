import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  listTeamMembers,
  inviteTeamMember,
  updateTeamMember,
  removeTeamMember,
} from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireTenant } from '../middleware/tenant.middleware.js';
import { requireAdmin, requireAdminOrEmployee } from '../middleware/role.middleware.js';
import { uploadImage } from '../middleware/upload.middleware.js';
import { uploadLimiter } from '../middleware/rateLimit.middleware.js';
import {
  validateInviteTeamMember,
  validateUpdateMember,
} from '../validators/company.validator.js';
import { validateUpdateProfile } from '../validators/auth.validator.js';

const router = Router();

router.use(authenticate);

// ── Own profile (no tenant required — user may not have a company yet) ──
router.get('/profile', getProfile);
router.put('/profile', validateUpdateProfile, updateProfile);
router.post('/avatar', uploadLimiter, uploadImage, uploadAvatar);

// ── Team management (tenant context required) ────────────────
router.get('/',          requireTenant, requireAdminOrEmployee, listTeamMembers);
router.post('/invite',   requireTenant, requireAdmin, validateInviteTeamMember, inviteTeamMember);
router.put('/:userId',   requireTenant, requireAdmin, validateUpdateMember, updateTeamMember);
router.delete('/:userId',requireTenant, requireAdmin, removeTeamMember);

export default router;
