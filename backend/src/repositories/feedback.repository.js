import mongoose from 'mongoose';
import { Feedback } from '../models/index.js';

export const feedbackRepository = {
  // Overall satisfaction stats for a date range
  async getSatisfactionStats(companyId, from, to) {
    return Feedback.getSatisfactionRate(
      new mongoose.Types.ObjectId(companyId),
      from,
      to
    );
  },

  // Daily breakdown of thumbs up/down for trend charts
  async getDailyBreakdown(companyId, from, to) {
    return Feedback.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            date:   { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            rating: '$rating',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);
  },

  // Recent feedback with comments (for admin review)
  async getRecent(companyId, limit = 20) {
    return Feedback.find({ companyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-__v');
  },
};
