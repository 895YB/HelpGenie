import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getMe,
  changePassword,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimit.middleware.js';
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
} from '../validators/auth.validator.js';

const router = Router();

// ── Public routes ────────────────────────────────────────────
router.post('/register', authLimiter, validateRegister, register);
router.post('/login',    authLimiter, validateLogin,    login);
router.post('/refresh',  refresh);

router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password/:token', validateResetPassword, resetPassword);
router.get('/verify-email/:token', verifyEmail);

// ── Protected routes ─────────────────────────────────────────
router.get('/me', authenticate, getMe);
router.post('/logout',     authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);
router.put('/change-password', authenticate, validateChangePassword, changePassword);

export default router;
