import { Company } from '../models/index.js';
import { AppError } from './error.middleware.js';

/**
 * Enforces multi-tenant isolation for authenticated dashboard routes.
 *
 * Reads companyId from req.user (set by authenticate()) and attaches
 * req.company + req.companyId so every controller can scope its queries.
 *
 * Must be used AFTER authenticate().
 */
export async function requireTenant(req, _res, next) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return next(AppError.forbidden('No company associated with this account'));
    }

    const company = await Company.findOne({ _id: companyId, isActive: true });
    if (!company) {
      return next(AppError.forbidden('Company not found or deactivated'));
    }

    req.company = company;
    req.companyId = company._id.toString();
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Resolves a company from the public widgetId query parameter.
 * Used on the public chat endpoint — no auth token required.
 *
 * Attaches req.company + req.companyId.
 */
export async function resolveWidgetTenant(req, _res, next) {
  try {
    const widgetId = req.body?.widgetId || req.query?.widgetId;
    if (!widgetId) {
      return next(AppError.badRequest('widgetId is required'));
    }

    const company = await Company.findByWidgetId(widgetId);
    if (!company) {
      return next(AppError.notFound('Widget not found'));
    }

    req.company = company;
    req.companyId = company._id.toString();
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Guards against accessing another company's resources.
 * Compares the resource's companyId field with req.companyId.
 * Admin role bypasses this check.
 */
export function assertSameTenant(resourceCompanyId, req) {
  if (req.userRole === 'admin') {return true;}
  return resourceCompanyId?.toString() === req.companyId;
}
