import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * Payload stored inside the access token.
 * Keep it small — it lives in every request header.
 */
export function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      companyId: user.companyId?.toString() ?? null,
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

/**
 * Refresh token carries only the userId.
 * Everything else is re-fetched from DB on rotation.
 */
export function generateRefreshToken(userId) {
  return jwt.sign(
    { userId: userId.toString() },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiresIn }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

/** SHA-256 hash of a token for safe DB storage. */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Parse "Bearer <token>" header value. Returns null when malformed. */
export function extractBearerToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {return null;}
  const token = authHeader.slice(7).trim();
  return token || null;
}

/** Returns the expiry Date object for a 7-day refresh token. */
export function refreshTokenExpiry() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}
