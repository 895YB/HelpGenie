import { companyService } from '../services/company.service.js';
import ApiResponse from '../utils/apiResponse.js';

export async function getCompany(req, res, next) {
  try {
    const company = await companyService.getCompany(req.companyId);
    return ApiResponse.success(res, { company });
  } catch (err) { next(err); }
}

export async function updateCompany(req, res, next) {
  try {
    const company = await companyService.updateCompany(req.companyId, req.body);
    return ApiResponse.success(res, { company }, 'Company updated successfully');
  } catch (err) { next(err); }
}

export async function uploadLogo(req, res, next) {
  try {
    const company = await companyService.uploadLogo(req.companyId, req.file);
    return ApiResponse.success(res, { logo: company.logo }, 'Logo uploaded successfully');
  } catch (err) { next(err); }
}

export async function getApiKey(req, res, next) {
  try {
    const data = await companyService.getApiKey(req.companyId);
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

export async function regenerateApiKey(req, res, next) {
  try {
    const data = await companyService.regenerateApiKey(req.companyId);
    return ApiResponse.success(res, data, 'API key regenerated. Update your integrations.');
  } catch (err) { next(err); }
}

export async function getEmbedCode(req, res, next) {
  try {
    const company = await companyService.getCompany(req.companyId);
    const embedCode = companyService.getEmbedCode(company);
    return ApiResponse.success(res, { embedCode, widgetId: company.widgetId });
  } catch (err) { next(err); }
}

export async function getSubscription(req, res, next) {
  try {
    const subscription = await companyService.getSubscription(req.companyId);
    return ApiResponse.success(res, { subscription });
  } catch (err) { next(err); }
}

/**
 * GET /api/company/widget-config
 * Public, unauthenticated — req.company is injected by resolveWidgetTenant
 * from the ?widgetId=... query param.
 */
export async function getWidgetConfig(req, res, next) {
  try {
    const config = companyService.buildWidgetConfig(req.company);
    return ApiResponse.success(res, config);
  } catch (err) { next(err); }
}
