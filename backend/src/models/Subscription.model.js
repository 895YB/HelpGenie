import mongoose from 'mongoose';

// Defines what each plan tier allows
const PLAN_LIMITS = {
  free: {
    maxDocuments: 5,
    maxChunks: 500,
    maxChatsPerMonth: 100,
    maxTeamMembers: 1,
    customWidget: false,
    analyticsRetentionDays: 7,
    prioritySupport: false,
  },
  starter: {
    maxDocuments: 25,
    maxChunks: 5000,
    maxChatsPerMonth: 1000,
    maxTeamMembers: 5,
    customWidget: true,
    analyticsRetentionDays: 30,
    prioritySupport: false,
  },
  pro: {
    maxDocuments: 100,
    maxChunks: 50000,
    maxChatsPerMonth: 10000,
    maxTeamMembers: 20,
    customWidget: true,
    analyticsRetentionDays: 90,
    prioritySupport: true,
  },
  enterprise: {
    maxDocuments: -1,        // unlimited
    maxChunks: -1,
    maxChatsPerMonth: -1,
    maxTeamMembers: -1,
    customWidget: true,
    analyticsRetentionDays: 365,
    prioritySupport: true,
  },
};

const featuresSchema = new mongoose.Schema(
  {
    maxDocuments: { type: Number, default: 5 },
    maxChunks: { type: Number, default: 500 },
    maxChatsPerMonth: { type: Number, default: 100 },
    maxTeamMembers: { type: Number, default: 1 },
    customWidget: { type: Boolean, default: false },
    analyticsRetentionDays: { type: Number, default: 7 },
    prioritySupport: { type: Boolean, default: false },
  },
  { _id: false }
);

const billingSchema = new mongoose.Schema(
  {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'usd' },
    interval: {
      type: String,
      enum: ['month', 'year'],
      default: 'month',
    },
    nextBillingDate: { type: Date, default: null },
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'past_due', 'trialing'],
      default: 'active',
    },
    features: {
      type: featuresSchema,
      default: () => ({ ...PLAN_LIMITS.free }),
    },
    billing: {
      type: billingSchema,
      default: () => ({}),
    },
    // Stripe integration fields (populated when payment processor is wired)
    stripeCustomerId: {
      type: String,
      default: null,
      sparse: true,
    },
    stripeSubscriptionId: {
      type: String,
      default: null,
      sparse: true,
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    trialEnd: {
      type: Date,
      default: null,
    },
    // Tracks usage within the current billing period
    usage: {
      chatsThisMonth: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ─────────────────────────────────────────────────
subscriptionSchema.index({ stripeSubscriptionId: 1 }, { sparse: true });
subscriptionSchema.index({ stripeCustomerId: 1 }, { sparse: true });
subscriptionSchema.index({ status: 1 });

// ── Statics ─────────────────────────────────────────────────
subscriptionSchema.statics.getPlanLimits = function (plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
};

// ── Methods ─────────────────────────────────────────────────
subscriptionSchema.methods.upgradePlan = function (newPlan) {
  this.plan = newPlan;
  this.features = { ...PLAN_LIMITS[newPlan] };
  return this;
};

subscriptionSchema.methods.isWithinChatLimit = function () {
  const limit = this.features.maxChatsPerMonth;
  if (limit === -1) return true; // unlimited
  return this.usage.chatsThisMonth < limit;
};

subscriptionSchema.methods.resetMonthlyUsage = function () {
  this.usage.chatsThisMonth = 0;
  this.usage.lastResetDate = new Date();
};

export { PLAN_LIMITS };
const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
