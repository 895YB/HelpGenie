import path from 'path';
import crypto from 'crypto';
import { userRepository } from '../repositories/user.repository.js';
import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { AppError } from '../middleware/error.middleware.js';
import { deleteUploadedFile } from '../middleware/upload.middleware.js';
import { sendEmailVerification } from './email.service.js';
import logger from '../utils/logger.js';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

export const userService = {
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {throw AppError.notFound('User not found');}
    return user.toSafeObject();
  },

  async updateProfile(userId, updates) {
    // Prevent privilege escalation via profile update
    delete updates.role;
    delete updates.companyId;
    delete updates.password;
    delete updates.isActive;

    const user = await userRepository.updateById(userId, updates);
    if (!user) {throw AppError.notFound('User not found');}
    return user.toSafeObject();
  },

  async uploadAvatar(userId, file) {
    if (!file) {throw AppError.badRequest('No image file provided');}

    const existing = await userRepository.findById(userId);
    if (existing?.avatar && existing.avatar.startsWith('/uploads/')) {
      deleteUploadedFile(path.resolve(existing.avatar.slice(1)));
    }

    const avatarUrl = `/uploads/images/${file.filename}`;
    const user = await userRepository.updateById(userId, { avatar: avatarUrl });
    return user.toSafeObject();
  },

  async listTeamMembers(companyId) {
    return userRepository.findByCompany(companyId);
  },

  async inviteTeamMember(companyId, { name, email, role }, invitedByUser) {
    // Enforce plan seat limits
    const sub = await subscriptionRepository.findByCompany(companyId);
    if (sub) {
      const limit = sub.features.maxTeamMembers;
      if (limit !== -1) {
        const count = await userRepository.countByCompany(companyId);
        if (count >= limit) {
          throw AppError.badRequest(
            `Your ${sub.plan} plan allows up to ${limit} team member${limit === 1 ? '' : 's'}. ` +
              'Upgrade to add more.'
          );
        }
      }
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw AppError.conflict('A user with this email already exists');
    }

    // Generate a temporary random password — user will reset via the email link
    const tempPassword = crypto.randomBytes(12).toString('base64url');

    const newUser = await userRepository.create({
      name,
      email,
      password: tempPassword,
      role,
      companyId,
      isEmailVerified: false,
    });

    const rawToken = newUser.createEmailVerificationToken();
    await newUser.save({ validateBeforeSave: false });

    const setupUrl = `${CLIENT_URL}/accept-invite/${rawToken}`;
    sendEmailVerification(email, setupUrl, name).catch((err) =>
      logger.error(`Invite email failed for ${email}: ${err.message}`)
    );

    logger.info(
      `Team member ${email} invited to company ${companyId} by ${invitedByUser.email}`
    );

    return newUser.toSafeObject();
  },

  async updateMember(companyId, targetUserId, updates, requestingUser) {
    const target = await userRepository.findById(targetUserId);
    if (!target) {throw AppError.notFound('User not found');}

    // Ensure the target belongs to the same company
    if (target.companyId?.toString() !== companyId) {
      throw AppError.forbidden('Cannot modify a user from a different company');
    }

    // Prevent non-admins from modifying others
    if (requestingUser.role !== 'admin' && requestingUser._id.toString() !== targetUserId) {
      throw AppError.forbidden('Only admins can modify other team members');
    }

    // Prevent the last admin from being demoted
    if (
      updates.role &&
      updates.role !== 'admin' &&
      target.role === 'admin'
    ) {
      const admins = await userRepository.findByCompany(companyId, 'admin');
      if (admins.length <= 1) {
        throw AppError.badRequest('Cannot demote the last admin. Promote another member first.');
      }
    }

    const allowed = {};
    if (updates.role !== undefined) {allowed.role = updates.role;}
    if (updates.isActive !== undefined) {allowed.isActive = updates.isActive;}

    const updated = await userRepository.updateById(targetUserId, allowed);
    return updated.toSafeObject();
  },

  async removeMember(companyId, targetUserId, requestingUserId) {
    if (targetUserId === requestingUserId) {
      throw AppError.badRequest('You cannot remove yourself from the team');
    }

    const target = await userRepository.findById(targetUserId);
    if (!target) {throw AppError.notFound('User not found');}

    if (target.companyId?.toString() !== companyId) {
      throw AppError.forbidden('Cannot remove a user from a different company');
    }

    // Prevent removing the last admin
    if (target.role === 'admin') {
      const admins = await userRepository.findByCompany(companyId, 'admin');
      if (admins.length <= 1) {
        throw AppError.badRequest('Cannot remove the last admin.');
      }
    }

    await userRepository.deactivate(targetUserId);
    logger.info(`User ${targetUserId} deactivated from company ${companyId}`);
  },
};
