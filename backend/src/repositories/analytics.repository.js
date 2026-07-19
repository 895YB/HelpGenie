import mongoose from 'mongoose';
import { Analytics } from '../models/index.js';

export const analyticsRepository = {
  // Raw daily documents for a date range (sorted oldest-first for charts)
  async getRange(companyId, from, to) {
    return Analytics.getRange(companyId, from, to);
  },

  // Server-side aggregation: sum all numeric fields across the date range
  async aggregateStats(companyId, from, to) {
    const [result] = await Analytics.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          date: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: null,
          totalChats:          { $sum: '$totalChats' },
          answeredFromContext: { $sum: '$answeredFromContext' },
          fallbackResponses:   { $sum: '$fallbackResponses' },
          totalResponseTimeMs: { $sum: '$totalResponseTimeMs' },
          thumbsUp:            { $sum: '$thumbsUp' },
          thumbsDown:          { $sum: '$thumbsDown' },
          totalTokensUsed:     { $sum: '$totalTokensUsed' },
          promptTokens:        { $sum: '$promptTokens' },
          completionTokens:    { $sum: '$completionTokens' },
        },
      },
    ]);
    return result ?? null;
  },

  // Aggregate hourlyChats arrays across all days (returns 24-element array)
  async aggregateHourly(companyId, from, to) {
    const docs = await Analytics.getRange(companyId, from, to);
    const hourly = new Array(24).fill(0);
    for (const doc of docs) {
      doc.hourlyChats.forEach((v, i) => { hourly[i] += v; });
    }
    return hourly;
  },

  // Aggregate top documents hit counts across the date range
  async aggregateDocumentUsage(companyId, from, to) {
    const results = await Analytics.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          date: { $gte: from, $lte: to },
        },
      },
      { $unwind: '$documentUsage' },
      {
        $group: {
          _id: '$documentUsage.documentId',
          documentName: { $first: '$documentUsage.documentName' },
          hitCount:     { $sum: '$documentUsage.hitCount' },
        },
      },
      { $sort: { hitCount: -1 } },
      { $limit: 10 },
    ]);
    return results;
  },
};
