import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const CONVERSATION_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
};

const conversationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    // Public session identifier — safe to expose to the widget
    sessionId: {
      type: String,
      required: true,
      unique: true,
      default: () => `sess_${uuidv4().replace(/-/g, '')}`,
    },
    // The widgetId the conversation originated from
    widgetId: {
      type: String,
      required: true,
      index: true,
    },
    // Optional — customer may provide their details
    customerEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    customerName: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(CONVERSATION_STATUS),
      default: CONVERSATION_STATUS.ACTIVE,
      index: true,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Overall rating given at conversation end (1-5)
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    // Anonymised for GDPR compliance
    ipAddress: {
      type: String,
      default: null,
      select: false,
    },
    userAgent: {
      type: String,
      default: null,
      select: false,
    },
    // Arbitrary context (referrer page, custom attributes, etc.)
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: () => new Map(),
    },
    // Tracks total tokens consumed in this conversation for cost analysis
    totalTokensUsed: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Compound Indexes ─────────────────────────────────────────
conversationSchema.index({ companyId: 1, status: 1, lastMessageAt: -1 });
conversationSchema.index({ companyId: 1, createdAt: -1 });
conversationSchema.index({ sessionId: 1 }, { unique: true });

// ── Virtuals ────────────────────────────────────────────────
conversationSchema.virtual('messages', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'conversationId',
  options: { sort: { createdAt: 1 } },
});

conversationSchema.virtual('duration').get(function () {
  const end = this.lastMessageAt || new Date();
  return Math.round((end - this.startedAt) / 1000); // seconds
});

// ── Statics ─────────────────────────────────────────────────
conversationSchema.statics.findBySession = function (sessionId) {
  return this.findOne({ sessionId });
};

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
