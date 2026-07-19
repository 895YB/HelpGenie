import { AppError } from './error.middleware.js';

/**
 * Role-based access control.
 * Must be used AFTER authenticate().
 *
 * Usage:
 *   router.delete('/users/:id', authenticate, requireRole('admin'), handler)
 *   router.get('/docs',         authenticate, requireRole('admin', 'employee'), handler)
 */
export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access denied. Required role: ${allowedRoles.join(' or ')}`
        )
      );
    }

    next();
  };
}

/**
 * Convenience wrappers for the three roles.
 */
export const requireAdmin = requireRole('admin');
export const requireAdminOrEmployee = requireRole('admin', 'employee');
export const requireAnyRole = requireRole('admin', 'employee', 'customer');
