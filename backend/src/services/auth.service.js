import crypto from 'crypto';
import { Company, Subscription } from '../models/index.js';
import { userRepository } from '../repositories/user.repository.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  refreshTokenExpiry,
} from '../utils/tokenHelper.js';
import {
  sendPasswordResetEmail,
  sendEmailVerification,
  sendWelcomeEmail,
} from './email.service.js';
import { AppError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ── Helpers ──────────────────────────────────────────────────

function buildTokenPair(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user._id);
  return { accessToken, refreshToken };
}

function cookieOptions(res) {
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  });
}

// ── Service ──────────────────────────────────────────────────

export const authService = {
  /**
   * Creates a new user and (optionally) a company on first registration.
   * The first user of a company becomes the admin.
   */
  async register({ name, email, password, companyName }, userAgent) {
    // Prevent duplicate accounts
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw AppError.conflict('An account with this email already exists');
    }

    let companyId = null;
    let role = 'employee';

    if (companyName) {
      // Auto-generate a slug from the company name
      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50)
        + '-' + Date.now().toString(36);

      const company = await Company.create({
        name: companyName.trim(),
        slug,
        email,
      });

      // Create a free subscription for the new company
      await Subscription.create({ companyId: company._id });

      companyId = company._id;
      role = 'admin'; // first user of a company is admin
    }

    const user = await userRepository.create({
      name: name.trim(),
      email,
      password,
      role,
      companyId,
    });

    // Send verification email (non-blocking)
    const rawToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verifyUrl = `${CLIENT_URL}/verify-email/${rawToken}`;
    sendEmailVerification(email, verifyUrl, name).catch((err) =>
      logger.error(`Verification email failed: ${err.message}`)
    );

    const { accessToken, refreshToken } = buildTokenPair(user);
    await this._storeRefreshToken(user, refreshToken, userAgent);

    return { user: user.toSafeObject(), accessToken, refreshToken };
  },

  async login({ email, password }, userAgent) {
    // +password is required because the field is select: false by default
    const user = await userRepository.findByEmail(email, '+password +refreshTokens');
    if (!user || !(await user.comparePassword(password))) {
      // Identical message for both cases — prevents user enumeration
      throw AppError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw AppError.unauthorized('Account has been deactivated. Contact support.');
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const { accessToken, refreshToken } = buildTokenPair(user);
    await this._storeRefreshToken(user, refreshToken, userAgent);

    return { user: user.toSafeObject(), accessToken, refreshToken };
  },

  /**
   * Token rotation: validates the old refresh token, issues a new pair,
   * and invalidates the old one (prevents replay attacks).
   */
  async refreshTokens(rawRefreshToken, userAgent) {
    if (!rawRefreshToken) {
      throw AppError.unauthorized('No refresh token provided');
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    const user = await userRepository.findByIdWithTokens(decoded.userId);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Account not found or deactivated');
    }

    const hash = hashToken(rawRefreshToken);
    const tokenEntry = user.refreshTokens.find((t) => t.hash === hash);

    if (!tokenEntry) {
      // Token not in DB — possible token reuse attack: revoke ALL tokens
      user.refreshTokens = [];
      await user.save({ validateBeforeSave: false });
      throw AppError.unauthorized('Refresh token reuse detected — please log in again');
    }

    if (tokenEntry.expiresAt < new Date()) {
      // Remove expired entry
      user.refreshTokens = user.refreshTokens.filter((t) => t.hash !== hash);
      await user.save({ validateBeforeSave: false });
      throw AppError.unauthorized('Refresh token has expired — please log in again');
    }

    // Rotate: remove old, store new
    user.refreshTokens = user.refreshTokens.filter((t) => t.hash !== hash);

    const { accessToken, refreshToken: newRefreshToken } = buildTokenPair(user);
    await this._storeRefreshToken(user, newRefreshToken, userAgent);

    return { user: user.toSafeObject(), accessToken, refreshToken: newRefreshToken };
  },

  async logout(userId, rawRefreshToken) {
    const user = await userRepository.findByIdWithTokens(userId);
    if (!user) return;

    if (rawRefreshToken) {
      const hash = hashToken(rawRefreshToken);
      user.refreshTokens = user.refreshTokens.filter((t) => t.hash !== hash);
    }

    await user.save({ validateBeforeSave: false });
  },

  async logoutAll(userId) {
    await userRepository.updateById(userId, { refreshTokens: [] });
  },

  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email);
    // Always return success to prevent user enumeration
    if (!user) return;

    const rawToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${CLIENT_URL}/reset-password/${rawToken}`;
    await sendPasswordResetEmail(email, resetUrl);
  },

  async resetPassword(rawToken, newPassword) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const user = await userRepository.findByPasswordResetToken(hashedToken);
    if (!user) {
      throw AppError.badRequest('Reset token is invalid or has expired');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = []; // invalidate all sessions after password change
    await user.save();

    return user.toSafeObject();
  },

  async verifyEmail(rawToken) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const user = await userRepository.findByEmailVerificationToken(hashedToken);
    if (!user) {
      throw AppError.badRequest('Verification token is invalid or has expired');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name).catch((err) =>
      logger.error(`Welcome email failed: ${err.message}`)
    );

    return user.toSafeObject();
  },

  async getMe(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found');
    return user.toSafeObject();
  },

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId, '+password +refreshTokens');
    if (!user) throw AppError.notFound('User not found');

    const valid = await user.comparePassword(currentPassword);
    if (!valid) throw AppError.unauthorized('Current password is incorrect');

    user.password = newPassword;
    user.refreshTokens = []; // invalidate all existing sessions
    await user.save();

    return user.toSafeObject();
  },

  // ── Private ────────────────────────────────────────────────

  async _storeRefreshToken(user, rawToken, userAgent) {
    const hash = hashToken(rawToken);
    const expiresAt = refreshTokenExpiry();

    // Prune expired tokens before appending
    user.refreshTokens = (user.refreshTokens || []).filter(
      (t) => t.expiresAt > new Date()
    );

    user.refreshTokens.push({ hash, expiresAt, userAgent: userAgent || null });
    await user.save({ validateBeforeSave: false });
  },
};
