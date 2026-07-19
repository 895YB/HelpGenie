import { analyticsService } from '../services/analytics.service.js';
import ApiResponse from '../utils/apiResponse.js';

export async function getOverview(req, res, next) {
  try {
    const data = await analyticsService.getOverview(req.companyId, req.query);
    return ApiResponse.success(res, data, 'Overview retrieved');
  } catch (err) { next(err); }
}

export async function getDailyChats(req, res, next) {
  try {
    const data = await analyticsService.getDailyChats(req.companyId, req.query);
    return ApiResponse.success(res, data, 'Daily chats retrieved');
  } catch (err) { next(err); }
}

export async function getHourlyDistribution(req, res, next) {
  try {
    const data = await analyticsService.getHourlyDistribution(req.companyId, req.query);
    return ApiResponse.success(res, data, 'Hourly distribution retrieved');
  } catch (err) { next(err); }
}

export async function getSatisfactionTrend(req, res, next) {
  try {
    const data = await analyticsService.getSatisfactionTrend(req.companyId, req.query);
    return ApiResponse.success(res, data, 'Satisfaction trend retrieved');
  } catch (err) { next(err); }
}

export async function getTokenUsage(req, res, next) {
  try {
    const data = await analyticsService.getTokenUsage(req.companyId, req.query);
    return ApiResponse.success(res, data, 'Token usage retrieved');
  } catch (err) { next(err); }
}

export async function getDocumentUsage(req, res, next) {
  try {
    const data = await analyticsService.getDocumentUsage(req.companyId, req.query);
    return ApiResponse.success(res, data, 'Document usage retrieved');
  } catch (err) { next(err); }
}

export async function getRecentFeedback(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const data = await analyticsService.getRecentFeedback(req.companyId, limit);
    return ApiResponse.success(res, data, 'Recent feedback retrieved');
  } catch (err) { next(err); }
}

export async function exportCsv(req, res, next) {
  try {
    const csv = await analyticsService.exportCsv(req.companyId, req.query);
    const filename = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) { next(err); }
}
