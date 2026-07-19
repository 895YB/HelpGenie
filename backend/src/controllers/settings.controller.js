import { companyService } from '../services/company.service.js';
import ApiResponse from '../utils/apiResponse.js';

export async function getSettings(req, res, next) {
  try {
    const settings = await companyService.getSettings(req.companyId);
    return ApiResponse.success(res, settings);
  } catch (err) { next(err); }
}

export async function updateSettings(req, res, next) {
  try {
    const company = await companyService.updateCompany(req.companyId, req.body);
    return ApiResponse.success(res, { company }, 'Settings updated');
  } catch (err) { next(err); }
}

export async function getTheme(req, res, next) {
  try {
    const theme = await companyService.getTheme(req.companyId);
    return ApiResponse.success(res, { theme });
  } catch (err) { next(err); }
}

export async function updateTheme(req, res, next) {
  try {
    const theme = await companyService.updateTheme(req.companyId, req.body);
    return ApiResponse.success(res, { theme }, 'Theme updated');
  } catch (err) { next(err); }
}

export async function getWidgetSettings(req, res, next) {
  try {
    const widgetSettings = await companyService.getWidgetSettings(req.companyId);
    return ApiResponse.success(res, { widgetSettings });
  } catch (err) { next(err); }
}

export async function updateWidgetSettings(req, res, next) {
  try {
    const widgetSettings = await companyService.updateWidgetSettings(req.companyId, req.body);
    return ApiResponse.success(res, { widgetSettings }, 'Widget settings updated');
  } catch (err) { next(err); }
}
