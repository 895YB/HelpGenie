/**
 * Unit tests for analyticsService.
 * All repository calls are mocked — no DB required.
 */

import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';

// ── Mocks ─────────────────────────────────────────────────────

jest.unstable_mockModule('../../src/repositories/analytics.repository.js', () => ({
  analyticsRepository: {
    getRange:               jest.fn(),
    aggregateStats:         jest.fn(),
    aggregateHourly:        jest.fn(),
    aggregateDocumentUsage: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/feedback.repository.js', () => ({
  feedbackRepository: {
    getSatisfactionStats: jest.fn(),
    getDailyBreakdown:    jest.fn(),
    getRecent:            jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Setup ─────────────────────────────────────────────────────

import mongoose from 'mongoose';

const COMPANY_ID = new mongoose.Types.ObjectId().toString();

const STATS = {
  totalChats:          100,
  answeredFromContext: 85,
  fallbackResponses:   15,
  totalResponseTimeMs: 42000,
  thumbsUp:            0,
  thumbsDown:          0,
  totalTokensUsed:     50000,
  promptTokens:        40000,
  completionTokens:    10000,
};

const SATISFACTION = { thumbsUp: 72, thumbsDown: 10, total: 82, satisfactionRate: 88 };

let analyticsService, analyticsRepository, feedbackRepository;

beforeEach(async () => {
  jest.clearAllMocks();

  const svcMod  = await import('../../src/services/analytics.service.js');
  const arMod   = await import('../../src/repositories/analytics.repository.js');
  const frMod   = await import('../../src/repositories/feedback.repository.js');

  analyticsService    = svcMod.analyticsService;
  analyticsRepository = arMod.analyticsRepository;
  feedbackRepository  = frMod.feedbackRepository;
});

// ── getOverview ───────────────────────────────────────────────

describe('analyticsService.getOverview', () => {
  beforeEach(() => {
    analyticsRepository.aggregateStats.mockResolvedValue(STATS);
    feedbackRepository.getSatisfactionStats.mockResolvedValue(SATISFACTION);
  });

  it('returns correct totalChats', async () => {
    const result = await analyticsService.getOverview(COMPANY_ID);
    expect(result.totalChats).toBe(100);
  });

  it('calculates avgResponseTimeMs correctly', async () => {
    const result = await analyticsService.getOverview(COMPANY_ID);
    expect(result.avgResponseTimeMs).toBe(420); // 42000 / 100
  });

  it('calculates answeredFromContextRate as a percentage', async () => {
    const result = await analyticsService.getOverview(COMPANY_ID);
    expect(result.answeredFromContextRate).toBe(85); // 85/100 = 85%
  });

  it('includes satisfaction stats from feedback repo', async () => {
    const result = await analyticsService.getOverview(COMPANY_ID);
    expect(result.satisfactionRate).toBe(88);
    expect(result.thumbsUp).toBe(72);
    expect(result.thumbsDown).toBe(10);
  });

  it('estimates cost using GPT-4.1 pricing', async () => {
    const result = await analyticsService.getOverview(COMPANY_ID);
    // 40000 * 2/1M + 10000 * 8/1M = 0.08 + 0.08 = 0.16
    expect(result.estimatedCostUsd).toBeCloseTo(0.16, 4);
  });

  it('returns zero avgResponseTimeMs when no chats', async () => {
    analyticsRepository.aggregateStats.mockResolvedValue(null);
    feedbackRepository.getSatisfactionStats.mockResolvedValue(
      { thumbsUp: 0, thumbsDown: 0, total: 0, satisfactionRate: null }
    );
    const result = await analyticsService.getOverview(COMPANY_ID);
    expect(result.totalChats).toBe(0);
    expect(result.avgResponseTimeMs).toBe(0);
  });

  it('includes period boundaries in the response', async () => {
    const result = await analyticsService.getOverview(COMPANY_ID, {
      from: '2025-07-01',
      to:   '2025-07-31',
    });
    expect(result.period.from).toBeInstanceOf(Date);
    expect(result.period.to).toBeInstanceOf(Date);
  });

  it('calls aggregateStats twice — current and previous period', async () => {
    await analyticsService.getOverview(COMPANY_ID);
    expect(analyticsRepository.aggregateStats).toHaveBeenCalledTimes(2);
  });

  it('computes positive trend when current > previous', async () => {
    analyticsRepository.aggregateStats
      .mockResolvedValueOnce({ ...STATS, totalChats: 120 }) // current
      .mockResolvedValueOnce({ ...STATS, totalChats: 100 }); // previous

    const result = await analyticsService.getOverview(COMPANY_ID);
    expect(result.trends.chats).toBeCloseTo(20, 0); // +20%
  });

  it('returns null trend when previous period has zero chats', async () => {
    analyticsRepository.aggregateStats
      .mockResolvedValueOnce(STATS)
      .mockResolvedValueOnce({ ...STATS, totalChats: 0 });

    const result = await analyticsService.getOverview(COMPANY_ID);
    expect(result.trends.chats).toBeNull();
  });
});

// ── getDailyChats ─────────────────────────────────────────────

describe('analyticsService.getDailyChats', () => {
  it('fills gaps for days with no data', async () => {
    // Only one document for a 3-day range
    analyticsRepository.getRange.mockResolvedValue([
      {
        date: new Date('2025-07-02T00:00:00Z'),
        totalChats: 5, answeredFromContext: 4, fallbackResponses: 1,
      },
    ]);

    const result = await analyticsService.getDailyChats(COMPANY_ID, {
      from: '2025-07-01',
      to:   '2025-07-03',
    });

    expect(result).toHaveLength(3);
    expect(result[0].date).toBe('2025-07-01');
    expect(result[0].totalChats).toBe(0); // gap filled
    expect(result[1].date).toBe('2025-07-02');
    expect(result[1].totalChats).toBe(5);
    expect(result[2].date).toBe('2025-07-03');
    expect(result[2].totalChats).toBe(0); // gap filled
  });

  it('returns empty array when repository returns no docs', async () => {
    analyticsRepository.getRange.mockResolvedValue([]);
    const result = await analyticsService.getDailyChats(COMPANY_ID, {
      from: '2025-07-01',
      to:   '2025-07-01',
    });
    expect(result).toHaveLength(1);
    expect(result[0].totalChats).toBe(0);
  });
});

// ── getHourlyDistribution ─────────────────────────────────────

describe('analyticsService.getHourlyDistribution', () => {
  it('returns 24 hourly buckets', async () => {
    const hourlyData = new Array(24).fill(0);
    hourlyData[9]  = 15; // 9am peak
    hourlyData[14] = 22; // 2pm peak
    analyticsRepository.aggregateHourly.mockResolvedValue(hourlyData);

    const result = await analyticsService.getHourlyDistribution(COMPANY_ID);

    expect(result).toHaveLength(24);
    expect(result[9].hour).toBe(9);
    expect(result[9].count).toBe(15);
    expect(result[14].count).toBe(22);
  });
});

// ── getSatisfactionTrend ──────────────────────────────────────

describe('analyticsService.getSatisfactionTrend', () => {
  it('returns overall + daily breakdown', async () => {
    feedbackRepository.getSatisfactionStats.mockResolvedValue(SATISFACTION);
    feedbackRepository.getDailyBreakdown.mockResolvedValue([
      { _id: { date: '2025-07-01', rating: 'thumbs_up' },   count: 5 },
      { _id: { date: '2025-07-01', rating: 'thumbs_down' }, count: 1 },
    ]);

    const result = await analyticsService.getSatisfactionTrend(COMPANY_ID);

    expect(result.overall.satisfactionRate).toBe(88);
    expect(result.daily).toHaveLength(1);
    expect(result.daily[0].date).toBe('2025-07-01');
    expect(result.daily[0].thumbsUp).toBe(5);
    expect(result.daily[0].thumbsDown).toBe(1);
  });
});

// ── getTokenUsage ─────────────────────────────────────────────

describe('analyticsService.getTokenUsage', () => {
  it('computes estimated cost correctly', async () => {
    analyticsRepository.aggregateStats.mockResolvedValue(STATS);
    analyticsRepository.getRange.mockResolvedValue([]);

    const result = await analyticsService.getTokenUsage(COMPANY_ID);

    expect(result.totalTokensUsed).toBe(50000);
    expect(result.promptTokens).toBe(40000);
    expect(result.completionTokens).toBe(10000);
    expect(result.estimatedCostUsd).toBeCloseTo(0.16, 4);
  });

  it('includes daily breakdown', async () => {
    analyticsRepository.aggregateStats.mockResolvedValue(STATS);
    analyticsRepository.getRange.mockResolvedValue([
      {
        date: new Date('2025-07-01T00:00:00Z'),
        totalTokensUsed: 1000, promptTokens: 800, completionTokens: 200,
      },
    ]);

    const result = await analyticsService.getTokenUsage(COMPANY_ID, {
      from: '2025-07-01', to: '2025-07-01',
    });
    expect(result.daily).toHaveLength(1);
    expect(result.daily[0].totalTokensUsed).toBe(1000);
  });
});

// ── exportCsv ─────────────────────────────────────────────────

describe('analyticsService.exportCsv', () => {
  it('returns a CSV string with a header row', async () => {
    analyticsRepository.getRange.mockResolvedValue([
      {
        date: new Date('2025-07-01T00:00:00Z'),
        totalChats: 10, answeredFromContext: 8, fallbackResponses: 2,
        thumbsUp: 7, thumbsDown: 1, totalResponseTimeMs: 4200,
        totalTokensUsed: 5000, promptTokens: 4000, completionTokens: 1000,
      },
    ]);

    const csv = await analyticsService.exportCsv(COMPANY_ID, {
      from: '2025-07-01', to: '2025-07-01',
    });

    const lines = csv.split('\n');
    expect(lines[0]).toContain('date');
    expect(lines[0]).toContain('totalChats');
    expect(lines[1]).toContain('2025-07-01');
    expect(lines[1]).toContain('10');
  });

  it('returns only header when no data exists', async () => {
    analyticsRepository.getRange.mockResolvedValue([]);
    const csv = await analyticsService.exportCsv(COMPANY_ID, {
      from: '2025-07-01', to: '2025-07-01',
    });
    expect(csv.split('\n')).toHaveLength(1); // header only
  });
});
