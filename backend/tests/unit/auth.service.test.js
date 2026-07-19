/**
 * Unit tests for authService.
 * All external dependencies (userRepository, email, models) are mocked —
 * these tests verify business logic only, never hit the database.
 */

import { jest } from '@jest/globals';

// ── Environment setup ────────────────────────────────────────
process.env.JWT_SECRET = 'test_access_secret_minimum_32_chars!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_minimum_32_chars!';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

// ── Mocks ────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/repositories/user.repository.js', () => ({
  userRepository: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findByIdWithTokens: jest.fn(),
    findByPasswordResetToken: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/models/index.js', () => ({
  Company: { create: jest.fn() },
  Subscription: { create: jest.fn() },
  User: {},
}));

jest.unstable_mockModule('../../src/services/email.service.js', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue({}),
  sendEmailVerification: jest.fn().mockResolvedValue({}),
  sendWelcomeEmail: jest.fn().mockResolvedValue({}),
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Helpers ───────────────────────────────────────────────────
import mongoose from 'mongoose';
import { hashToken } from '../../src/utils/tokenHelper.js';

function makeUser(overrides = {}) {
  const id = new mongoose.Types.ObjectId();
  return {
    _id: id,
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    companyId: new mongoose.Types.ObjectId(),
    isActive: true,
    isEmailVerified: false,
    refreshTokens: [],
    comparePassword: jest.fn(),
    createEmailVerificationToken: jest.fn().mockReturnValue('raw-verify-token'),
    toSafeObject: jest.fn().mockReturnValue({ id: id.toString(), name: 'Test User' }),
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────
describe('authService', () => {
  let authService;
  let userRepository;
  let Company;
  let Subscription;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await import('../../src/services/auth.service.js');
    const repoMod = await import('../../src/repositories/user.repository.js');
    const modelMod = await import('../../src/models/index.js');

    authService = mod.authService;
    userRepository = repoMod.userRepository;
    Company = modelMod.Company;
    Subscription = modelMod.Subscription;
  });

  // ── register ────────────────────────────────────────────────
  describe('register', () => {
    it('throws conflict error when email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());

      await expect(
        authService.register({ name: 'A', email: 'test@example.com', password: 'Pass1word!' })
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('creates user without company when no companyName given', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      const user = makeUser();
      userRepository.create.mockResolvedValue(user);

      const result = await authService.register({
        name: 'Jane',
        email: 'jane@x.com',
        password: 'Pass1word!',
      });

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'employee', companyId: null })
      );
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('creates company + subscription and sets role=admin when companyName provided', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      const companyId = new mongoose.Types.ObjectId();
      Company.create.mockResolvedValue({ _id: companyId });
      Subscription.create.mockResolvedValue({});
      const user = makeUser({ role: 'admin', companyId });
      userRepository.create.mockResolvedValue(user);

      await authService.register({
        name: 'Alice',
        email: 'alice@acme.com',
        password: 'Pass1word!',
        companyName: 'Acme Corp',
      });

      expect(Company.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Acme Corp', email: 'alice@acme.com' })
      );
      expect(Subscription.create).toHaveBeenCalledWith({ companyId });
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'admin', companyId })
      );
    });
  });

  // ── login ───────────────────────────────────────────────────
  describe('login', () => {
    it('throws 401 when user not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      await expect(
        authService.login({ email: 'x@x.com', password: 'wrong' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 when password does not match', async () => {
      const user = makeUser();
      user.comparePassword.mockResolvedValue(false);
      userRepository.findByEmail.mockResolvedValue(user);

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrongPass1!' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 for inactive account', async () => {
      const user = makeUser({ isActive: false });
      user.comparePassword.mockResolvedValue(true);
      userRepository.findByEmail.mockResolvedValue(user);

      await expect(
        authService.login({ email: 'test@example.com', password: 'Pass1word!' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('returns tokens on successful login', async () => {
      const user = makeUser();
      user.comparePassword.mockResolvedValue(true);
      userRepository.findByEmail.mockResolvedValue(user);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Pass1word!',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(user.save).toHaveBeenCalled();
    });
  });

  // ── forgotPassword ──────────────────────────────────────────
  describe('forgotPassword', () => {
    it('silently returns when user not found (prevents enumeration)', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      // Should not throw
      await expect(authService.forgotPassword('nobody@x.com')).resolves.toBeUndefined();
    });

    it('creates and saves reset token when user exists', async () => {
      const user = makeUser();
      user.createPasswordResetToken = jest.fn().mockReturnValue('raw-reset-token');
      userRepository.findByEmail.mockResolvedValue(user);

      await authService.forgotPassword('test@example.com');

      expect(user.createPasswordResetToken).toHaveBeenCalled();
      expect(user.save).toHaveBeenCalled();
    });
  });

  // ── resetPassword ───────────────────────────────────────────
  describe('resetPassword', () => {
    it('throws 400 for invalid/expired token', async () => {
      userRepository.findByPasswordResetToken.mockResolvedValue(null);
      await expect(
        authService.resetPassword('bad-token', 'NewPass1!')
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('resets password and clears all sessions', async () => {
      const user = makeUser();
      user.refreshTokens = [{ hash: 'old-hash', expiresAt: new Date() }];
      userRepository.findByPasswordResetToken.mockResolvedValue(user);

      await authService.resetPassword('valid-raw-token', 'NewPass1!');

      expect(user.password).toBe('NewPass1!');
      expect(user.refreshTokens).toHaveLength(0);
      expect(user.passwordResetToken).toBeUndefined();
      expect(user.save).toHaveBeenCalled();
    });
  });

  // ── refreshTokens ───────────────────────────────────────────
  describe('refreshTokens', () => {
    it('throws 401 when no token provided', async () => {
      await expect(authService.refreshTokens(null)).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 for token reuse (not in DB)', async () => {
      // generate a real refresh token so verifyRefreshToken passes
      const { generateRefreshToken } = await import('../../src/utils/tokenHelper.js');
      const userId = new mongoose.Types.ObjectId();
      const token = generateRefreshToken(userId);

      const user = makeUser({ _id: userId, refreshTokens: [] });
      userRepository.findByIdWithTokens.mockResolvedValue(user);

      await expect(authService.refreshTokens(token)).rejects.toMatchObject({
        statusCode: 401,
      });
      // All sessions cleared after reuse detection
      expect(user.refreshTokens).toHaveLength(0);
      expect(user.save).toHaveBeenCalled();
    });
  });

  // ── logout ──────────────────────────────────────────────────
  describe('logout', () => {
    it('removes the specific refresh token hash from user', async () => {
      const { generateRefreshToken } = await import('../../src/utils/tokenHelper.js');
      const userId = new mongoose.Types.ObjectId();
      const token = generateRefreshToken(userId);
      const hash = hashToken(token);

      const user = makeUser({
        _id: userId,
        refreshTokens: [
          { hash, expiresAt: new Date(Date.now() + 1e9) },
          { hash: 'other-hash', expiresAt: new Date(Date.now() + 1e9) },
        ],
      });
      userRepository.findByIdWithTokens.mockResolvedValue(user);

      await authService.logout(userId.toString(), token);

      expect(user.refreshTokens.some((t) => t.hash === hash)).toBe(false);
      expect(user.refreshTokens.some((t) => t.hash === 'other-hash')).toBe(true);
    });
  });
});
