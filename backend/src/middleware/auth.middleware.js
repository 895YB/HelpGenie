import { verifyAccessToken, extractBearerToken } from '../utils/tokenHelper.js';
import { User } from '../models/index.js';
import { AppError } from './error.middleware.js';

/**
 * Verifies the Bearer JWT and attaches the user to req.user.
 * Routes that require authentication must use this middleware.
 */
export async function authenticate(req, _res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return next(AppError.unauthorized('No authentication token provided'));
    }

    const decoded = verifyAccessToken(token);

    // Fetch fresh user so deactivated accounts are blocked immediately
    const user = await User.findById(decoded.userId).select('+isActive');
    if (!user || !user.isActive) {
      return next(AppError.unauthorized('Account not found or deactivated'));
    }

    req.user = user;
    req.userId = user._id.toString();
    req.companyId = user.companyId?.toString() ?? null;
    req.userRole = user.role;

    next();
  } catch (err) {
    next(err); // JWT errors are translated by errorMiddleware
  }
}

/**
 * Optional authentication — attaches req.user when a valid token is
 * present, but does NOT block unauthenticated requests.
 * Used on public endpoints that behave differently for logged-in users.
 */
export async function optionalAuthenticate(req, _res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) return next();

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId);
    if (user?.isActive) {
      req.user = user;
      req.userId = user._id.toString();
      req.companyId = user.companyId?.toString() ?? null;
      req.userRole = user.role;
    }
    next();
  } catch {
    // Ignore invalid tokens on optional routes
    next();
  }
}
