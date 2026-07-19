import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const themeSchema = new mongoose.Schema(
  {
    primaryColor: { type: String, default: '#0ea5e9' },
    secondaryColor: { type: String, default: '#0284c7' },
    accentColor: { type: String, default: '#38bdf8' },
    fontFamily: { type: String, default: 'Inter' },
    borderRadius: { type: String, default: 'rounded-xl' },
    darkMode: { type: Boolean, default: false },
    logoUrl: { type: String, default: null },
  },
  { _id: false }
);

const widgetSettingsSchema = new mongoose.Schema(
  {
    greeting: { type: String, default: 'Hi! How can I help you today?' },
    placeholder: { type: String, default: 'Ask me anything...' },
    botName: { type: String, default: 'Support Assistant' },
    avatarUrl: { type: String, default: null },
    suggestedQuestions: { type: [String], default: [] },
    showSources: { type: Boolean, default: true },
    allowFeedback: { type: Boolean, default: true },
    allowEmailTranscript: { type: Boolean, default: true },
    position: {
      type: String,
      enum: ['bottom-right', 'bottom-left'],
      default: 'bottom-right',
    },
    zIndex: { type: Number, default: 9999 },
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },
    // URL-friendly identifier, e.g. "acme-corp"
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    email: {
      type: String,
      required: [true, 'Company email is required'],
      lowercase: true,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
      default: null,
    },
    logo: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    industry: {
      type: String,
      trim: true,
      default: null,
    },
    // The secret key used by backend SDK / server-to-server calls
    apiKey: {
      type: String,
      unique: true,
      default: () => `ak_${uuidv4().replace(/-/g, '')}`,
      select: false, // never returned by default; must be explicitly selected
    },
    // Public ID embedded in the widget <script> tag
    widgetId: {
      type: String,
      unique: true,
      default: () => `wid_${uuidv4().replace(/-/g, '')}`,
    },
    theme: {
      type: themeSchema,
      default: () => ({}),
    },
    widgetSettings: {
      type: widgetSettingsSchema,
      default: () => ({}),
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Denormalized from Subscription for fast checks
    plan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ─────────────────────────────────────────────────
companySchema.index({ slug: 1 });
companySchema.index({ widgetId: 1 });
companySchema.index({ apiKey: 1 }, { sparse: true });

// ── Methods ─────────────────────────────────────────────────
companySchema.methods.regenerateApiKey = function () {
  this.apiKey = `ak_${uuidv4().replace(/-/g, '')}`;
  return this.apiKey;
};

companySchema.methods.regenerateWidgetId = function () {
  this.widgetId = `wid_${uuidv4().replace(/-/g, '')}`;
  return this.widgetId;
};

// ── Statics ─────────────────────────────────────────────────
companySchema.statics.findByWidgetId = function (widgetId) {
  return this.findOne({ widgetId, isActive: true });
};

companySchema.statics.findByApiKey = function (apiKey) {
  return this.findOne({ apiKey, isActive: true }).select('+apiKey');
};

const Company = mongoose.model('Company', companySchema);
export default Company;
