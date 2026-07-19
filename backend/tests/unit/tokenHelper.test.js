import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  extractBearerToken,
  refreshTokenExpiry,
} from '../../src/utils/tokenHelper.js';
import mongoose from 'mongoose';

// Set env vars before module imports that read them at call-time
process.env.JWT_SECRET = 'test_access_secret_minimum_32_chars!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_minimum_32_chars!';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

const fakeUser = {
  _id: new mongoose.Types.ObjectId(),
  companyId: new mongoose.Types.ObjectId(),
  role: 'admin',
};

describe('tokenHelper', () => {
  describe('generateAccessToken / verifyAccessToken', () => {
    it('generates a verifiable access token', () => {
      const token = generateAccessToken(fakeUser);
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(fakeUser._id.toString());
      expect(decoded.companyId).toBe(fakeUser.companyId.toString());
      expect(decoded.role).toBe('admin');
    });

    it('throws for an invalid access token', () => {
      expect(() => verifyAccessToken('bad.token.here')).toThrow();
    });

    it('throws for a token signed with the wrong secret', async () => {
      const jwt = await import('jsonwebtoken');
      const sign = jwt.default?.sign ?? jwt.sign;
      const bad = sign({ userId: '123' }, 'wrong_secret');
      expect(() => verifyAccessToken(bad)).toThrow();
    });
  });

  describe('generateRefreshToken / verifyRefreshToken', () => {
    it('generates a verifiable refresh token', () => {
      const token = generateRefreshToken(fakeUser._id);
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(fakeUser._id.toString());
    });

    it('does NOT contain companyId or role (minimal payload)', () => {
      const token = generateRefreshToken(fakeUser._id);
      const decoded = verifyRefreshToken(token);
      expect(decoded.companyId).toBeUndefined();
      expect(decoded.role).toBeUndefined();
    });
  });

  describe('hashToken', () => {
    it('produces a 64-char hex string', () => {
      const hash = hashToken('my-raw-token');
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('is deterministic', () => {
      expect(hashToken('abc')).toBe(hashToken('abc'));
    });

    it('is different for different inputs', () => {
      expect(hashToken('abc')).not.toBe(hashToken('xyz'));
    });
  });

  describe('extractBearerToken', () => {
    it('extracts token from valid Bearer header', () => {
      expect(extractBearerToken('Bearer my.jwt.token')).toBe('my.jwt.token');
    });

    it('returns null for missing header', () => {
      expect(extractBearerToken(null)).toBeNull();
      expect(extractBearerToken(undefined)).toBeNull();
    });

    it('returns null for non-Bearer scheme', () => {
      expect(extractBearerToken('Basic abc123')).toBeNull();
    });

    it('returns null for "Bearer " with no token', () => {
      expect(extractBearerToken('Bearer ')).toBeNull();
    });
  });

  describe('refreshTokenExpiry', () => {
    it('returns a Date approximately 7 days from now', () => {
      const expiry = refreshTokenExpiry();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const diff = expiry.getTime() - Date.now();
      expect(diff).toBeGreaterThan(sevenDaysMs - 5000);
      expect(diff).toBeLessThan(sevenDaysMs + 5000);
    });
  });
});
