/**
 * Analytics Service — aggregates pre-computed daily metrics for dashboard charts.
 *
 * Data is already aggregated at write-time by the chat service (Analytics.incrementDay/Hour),
 * so reads are cheap: just sum/transform pre-bucketed documents.
 *
 * Cost estimation uses approximate GPT-4.1 pricing:
 *   - Input:  $2.00 / 1M tokens
 *   - Output: $8.00 / 1M tokens
 */

import { analyticsRepository } from '../repositories/analytics.repository.js';
import { feedbackRepository }  from '../repositories/feedback.repository.js';

const COST_PER_PROMPT_TOKEN     = 2.00 / 1_000_000;
const COST_PER_COMPLETION_TOKEN = 8.00 / 1_000_000;
const DEFAULT_RANGE_DAYS        = 30;

// ── Public API ────────────────────────────────────────────────

export const analyticsService = {
  /**
   * KPI cards for the dashboard header.
   * Includes % change vs the equivalent previous period.
   */
  async getOverview(companyId, { from, to } = {}) {
    const { start, end } = _resolveRange(from, to);
    const { prevStart, prevEnd } = _previousPeriod(start, end);

    const [current, previous, satisfaction, prevSatisfaction] = await Promise.all([
      analyticsRepository.aggregateStats(companyId, start, end),
      analyticsRepository.aggregateStats(companyId, prevStart, prevEnd),
      feedbackRepository.getSatisfactionStats(companyId, start, end),
      feedbackRepository.getSatisfactionStats(companyId, prevStart, prevEnd),
    ]);

    const cur = current ?? _emptyStats();
    const pre = previous ?? _emptyStats();

    const avgResponseMs = cur.totalChats > 0
      ? Math.round(cur.totalResponseTimeMs / cur.totalChats)
      : 0;
    const prevAvgResponseMs = pre.totalChats > 0
      ? Math.round(pre.totalResponseTimeMs / pre.totalChats)
      : 0;

    const answeredRate = cur.totalChats > 0
      ? Math.round((cur.answeredFromContext / cur.totalChats) * 100)
      : 0;

    const estimatedCostUsd = _estimateCost(cur.promptTokens, cur.completionTokens);

    return {
      period:              { from: start, to: end },
      totalChats:          cur.totalChats,
      avgResponseTimeMs:   avgResponseMs,
      answeredFromContextRate: answeredRate,
      satisfactionRate:    satisfaction.satisfactionRate,
      thumbsUp:            satisfaction.thumbsUp,
      thumbsDown:          satisfaction.thumbsDown,
      totalTokensUsed:     cur.totalTokensUsed,
      estimatedCostUsd,
      trends: {
        chats:        _trend(cur.totalChats, pre.totalChats),
        responseTime: _trend(avgResponseMs, prevAvgResponseMs),
        satisfaction: _trend(satisfaction.satisfactionRate, prevSatisfaction.satisfactionRate),
        cost:         _trend(estimatedCostUsd, _estimateCost(pre.promptTokens, pre.completionTokens)),
      },
    };
  },

  /**
   * Daily chat counts for the line chart.
   * Returns one object per calendar day in the range, filling gaps with zeros.
   */
  async getDailyChats(companyId, { from, to } = {}) {
    const { start, end } = _resolveRange(from, to);
    const docs = await analyticsRepository.getRange(companyId, start, end);

    return _fillDateGaps(start, end, docs, (doc) => ({
      totalChats:          doc.totalChats,
      answeredFromContext: doc.answeredFromContext,
      fallbackResponses:   doc.fallbackResponses,
    }));
  },

  /**
   * Hourly chat distribution summed across the range (24-element array).
   * Used for the bar chart showing peak hours.
   */
  async getHourlyDistribution(companyId, { from, to } = {}) {
    const { start, end } = _resolveRange(from, to);
    const hourly = await analyticsRepository.aggregateHourly(companyId, start, end);

    return hourly.map((count, hour) => ({ hour, count }));
  },

  /**
   * Satisfaction trend — daily thumbs up/down breakdown.
   */
  async getSatisfactionTrend(companyId, { from, to } = {}) {
    const { start, end } = _resolveRange(from, to);
    const [overall, daily] = await Promise.all([
      feedbackRepository.getSatisfactionStats(companyId, start, end),
      feedbackRepository.getDailyBreakdown(companyId, start, end),
    ]);

    // Pivot the daily breakdown into { date → { thumbs_up, thumbs_down } }
    const byDate = {};
    for (const row of daily) {
      const { date, rating } = row._id;
      if (!byDate[date]) {byDate[date] = { thumbsUp: 0, thumbsDown: 0 };}
      if (rating === 'thumbs_up')   {byDate[date].thumbsUp   = row.count;}
      if (rating === 'thumbs_down') {byDate[date].thumbsDown = row.count;}
    }

    const dailyArray = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    return { overall, daily: dailyArray };
  },

  /**
   * Token usage and cost breakdown — daily and total.
   */
  async getTokenUsage(companyId, { from, to } = {}) {
    const { start, end } = _resolveRange(from, to);
    const [totals, docs] = await Promise.all([
      analyticsRepository.aggregateStats(companyId, start, end),
      analyticsRepository.getRange(companyId, start, end),
    ]);

    const cur = totals ?? _emptyStats();
    const daily = _fillDateGaps(start, end, docs, (doc) => ({
      totalTokensUsed:  doc.totalTokensUsed,
      promptTokens:     doc.promptTokens,
      completionTokens: doc.completionTokens,
      estimatedCostUsd: _estimateCost(doc.promptTokens, doc.completionTokens),
    }));

    return {
      totalTokensUsed:     cur.totalTokensUsed,
      promptTokens:        cur.promptTokens,
      completionTokens:    cur.completionTokens,
      estimatedCostUsd:    _estimateCost(cur.promptTokens, cur.completionTokens),
      daily,
    };
  },

  /**
   * Top documents by retrieval hit count.
   */
  async getDocumentUsage(companyId, { from, to } = {}) {
    const { start, end } = _resolveRange(from, to);
    return analyticsRepository.aggregateDocumentUsage(companyId, start, end);
  },

  /**
   * Recent feedback entries with comments (for the admin review panel).
   */
  async getRecentFeedback(companyId, limit = 20) {
    return feedbackRepository.getRecent(companyId, limit);
  },

  /**
   * CSV export of daily analytics for the date range.
   */
  async exportCsv(companyId, { from, to } = {}) {
    const { start, end } = _resolveRange(from, to);
    const docs = await analyticsRepository.getRange(companyId, start, end);

    const header = [
      'date', 'totalChats', 'answeredFromContext', 'fallbackResponses',
      'thumbsUp', 'thumbsDown', 'avgResponseTimeMs',
      'totalTokensUsed', 'promptTokens', 'completionTokens', 'estimatedCostUsd',
    ].join(',');

    const rows = docs.map((doc) => {
      const avgMs = doc.totalChats > 0
        ? Math.round(doc.totalResponseTimeMs / doc.totalChats)
        : 0;
      return [
        doc.date.toISOString().slice(0, 10),
        doc.totalChats,
        doc.answeredFromContext,
        doc.fallbackResponses,
        doc.thumbsUp,
        doc.thumbsDown,
        avgMs,
        doc.totalTokensUsed,
        doc.promptTokens,
        doc.completionTokens,
        _estimateCost(doc.promptTokens, doc.completionTokens),
      ].join(',');
    });

    return [header, ...rows].join('\n');
  },
};

// ── Private helpers ───────────────────────────────────────────

function _resolveRange(from, to) {
  const end   = to   ? _midnight(new Date(to))   : _midnight(new Date());
  const start = from ? _midnight(new Date(from))  : new Date(end - (DEFAULT_RANGE_DAYS - 1) * 86_400_000);
  return { start, end };
}

function _midnight(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function _previousPeriod(start, end) {
  const durationMs = end - start + 86_400_000; // inclusive
  return {
    prevEnd:   new Date(start - 86_400_000),
    prevStart: new Date(start - durationMs),
  };
}

function _trend(current, previous) {
  if (previous === null || previous === undefined || previous === 0) {return null;}
  return Math.round(((current - previous) / previous) * 1000) / 10; // 1 decimal %
}

function _estimateCost(promptTokens = 0, completionTokens = 0) {
  const cost = promptTokens * COST_PER_PROMPT_TOKEN + completionTokens * COST_PER_COMPLETION_TOKEN;
  return Math.round(cost * 10000) / 10000; // 4 decimal places
}

function _emptyStats() {
  return {
    totalChats: 0, answeredFromContext: 0, fallbackResponses: 0,
    totalResponseTimeMs: 0, thumbsUp: 0, thumbsDown: 0,
    totalTokensUsed: 0, promptTokens: 0, completionTokens: 0,
  };
}

/**
 * Merges daily DB records with a zero-filled array covering every calendar day
 * in [start, end], so charts always have a continuous x-axis.
 */
function _fillDateGaps(start, end, docs, mapper) {
  const docMap = new Map(
    docs.map((d) => [d.date.toISOString().slice(0, 10), d])
  );

  const result = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const doc = docMap.get(key);
    result.push({
      date: key,
      ...(doc ? mapper(doc) : _zeroMapper(mapper)),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

function _zeroMapper(mapper) {
  // Call mapper with a zeroed document to infer the shape, then zero all values
  const sample = mapper({
    totalChats: 0, answeredFromContext: 0, fallbackResponses: 0,
    totalResponseTimeMs: 0, thumbsUp: 0, thumbsDown: 0,
    totalTokensUsed: 0, promptTokens: 0, completionTokens: 0,
  });
  return Object.fromEntries(Object.keys(sample).map((k) => [k, 0]));
}
