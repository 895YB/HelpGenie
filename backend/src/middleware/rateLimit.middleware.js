import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const json429 = (_req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests — please slow down and try again later.',
  });
};

/**
 * General API rate limit: 100 req / 15 min per IP.
 */
export const globalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
  skip: () => env.isTest,
});

/**
 * Strict limit for auth endpoints to slow brute-force attacks.
 * 10 attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts — please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
  skip: () => env.isTest,
});

/**
 * Password-reset endpoint: 5 per hour per IP.
 * Prevents email flooding.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
  skip: () => env.isTest,
});

/**
 * Chat endpoint: 60 messages per minute per IP.
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
  skip: () => env.isTest,
});

/**
 * Document upload: 20 per hour per IP.
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
  skip: () => env.isTest,
});
