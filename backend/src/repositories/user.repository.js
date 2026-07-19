import { User } from '../models/index.js';

/**
 * Data-access layer for User documents.
 * Controllers and services NEVER import mongoose models directly —
 * they go through a repository so the persistence layer is swappable.
 */

export const userRepository = {
  async findById(id, selectFields = '') {
    return User.findById(id).select(selectFields);
  },

  async findByEmail(email, selectFields = '') {
    return User.findOne({ email: email.toLowerCase().trim() }).select(selectFields);
  },

  async findByCompany(companyId, role = null) {
    const filter = { companyId, isActive: true };
    if (role) filter.role = role;
    return User.find(filter).sort({ createdAt: -1 });
  },

  async create(data) {
    return User.create(data);
  },

  async updateById(id, updates) {
    return User.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  },

  async findByPasswordResetToken(hashedToken) {
    return User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires +password');
  },

  async findByEmailVerificationToken(hashedToken) {
    return User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');
  },

  /** Returns the user with refresh tokens included (never returned by default). */
  async findByIdWithTokens(id) {
    return User.findById(id).select('+refreshTokens +password');
  },

  async countByCompany(companyId) {
    return User.countDocuments({ companyId, isActive: true });
  },

  async deactivate(id) {
    return User.findByIdAndUpdate(id, { isActive: false }, { new: true });
  },
};
