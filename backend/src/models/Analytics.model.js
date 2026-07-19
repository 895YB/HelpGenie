import mongoose from 'mongoose';

// One document per company per calendar day.
// Aggregated at write-time to avoid expensive ad-hoc aggregations on dashboards.

const documentUsageSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    documentName: { type: String },
    hitCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const topQuestionSchema = new mongoose.Schema(
  {
    question: { type: String },
    count: { type: Number, default: 1 },
    avgSatisfaction: { type: Number, default: null },
  },
  { _id: false }
);

const analyticsSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    // Stored as midnight UTC of the calendar day, e.g. 2025-07-19T00:00:00Z
    date: {
      type: Date,
      required: true,
      index: true,
    },

    // ── Chat metrics ──────────────────────────────────────────
    totalChats: { type: Number, default: 0 },
    uniqueSessions: { type: Number, default: 0 },
    // Messages where the RAG pipeline found relevant context
    answeredFromContext: { type: Number, default: 0 },
    // Messages that returned the fallback "not found" response
    fallbackResponses: { type: Number, default: 0 },

    // ── Performance metrics ───────────────────────────────────
    totalResponseTimeMs: { type: Number, default: 0 },   // sum, divide by totalChats for avg
    avgResponseTimeMs: { type: Number, default: 0 },

    // ── Satisfaction metrics ──────────────────────────────────
    thumbsUp: { type: Number, default: 0 },
    thumbsDown: { type: Number, default: 0 },
    avgRating: { type: Number, default: null },           // conversation-level ratings

    // ── Token usage (for cost tracking) ──────────────────────
    totalTokensUsed: { type: Number, default: 0 },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },

    // ── 24-element arrays — one slot per hour of the day (UTC) ──
    hourlyChats: {
      type: [Number],
      default: () => new Array(24).fill(0),
      validate: {
        validator: (arr) => arr.length === 24,
        message: 'hourlyChats must have exactly 24 elements',
      },
    },

    // ── Top-N questions for the day ───────────────────────────
    topQuestions: {
      type: [topQuestionSchema],
      default: [],
    },

    // ── Per-document retrieval counts ─────────────────────────
    documentUsage: {
      type: [documentUsageSchema],
      default: [],
    },

    // ── Active unique visitors (deduplicated sessionIds) ──────
    activeUserCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// ── Compound Index — unique per company per day ──────────────
analyticsSchema.index({ companyId: 1, date: 1 }, { unique: true });
analyticsSchema.index({ companyId: 1, date: -1 });

// ── Statics ─────────────────────────────────────────────────

/**
 * Upsert an analytics record for today and increment the given fields.
 * Safe for concurrent requests — MongoDB $inc is atomic.
 */
analyticsSchema.statics.incrementDay = function (companyId, date, increments) {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);

  return this.findOneAndUpdate(
    { companyId, date: dayStart },
    { $inc: increments, $setOnInsert: { companyId, date: dayStart } },
    { upsert: true, new: true }
  );
};

/**
 * Increment the hourly bucket for a given UTC hour (0–23).
 */
analyticsSchema.statics.incrementHour = function (companyId, date, hour) {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);

  const field = `hourlyChats.${hour}`;
  return this.findOneAndUpdate(
    { companyId, date: dayStart },
    { $inc: { [field]: 1 }, $setOnInsert: { companyId, date: dayStart } },
    { upsert: true, new: true }
  );
};

/**
 * Returns daily stats for a date range, sorted oldest-first.
 */
analyticsSchema.statics.getRange = function (companyId, startDate, endDate) {
  return this.find({
    companyId,
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1 });
};

const Analytics = mongoose.model('Analytics', analyticsSchema);
export default Analytics;
