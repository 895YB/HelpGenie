/**
 * Smoke-tests every model schema:
 * - imports without error
 * - required field validation fires correctly
 * - defaults are applied
 * - instance methods exist and behave
 *
 * No database connection needed — mongoose validates in-memory.
 */

import mongoose from 'mongoose';
import User from '../../src/models/User.model.js';
import Company from '../../src/models/Company.model.js';
import Document from '../../src/models/Document.model.js';
import Chunk from '../../src/models/Chunk.model.js';
import Conversation from '../../src/models/Conversation.model.js';
import Message from '../../src/models/Message.model.js';
import Analytics from '../../src/models/Analytics.model.js';
import Feedback from '../../src/models/Feedback.model.js';
import Subscription from '../../src/models/Subscription.model.js';
import { PLAN_LIMITS } from '../../src/models/Subscription.model.js';

const fakeId = () => new mongoose.Types.ObjectId();

// ── User ────────────────────────────────────────────────────
describe('User model', () => {
  it('fails validation when required fields are missing', async () => {
    const user = new User({});
    await expect(user.validate()).rejects.toThrow();
  });

  it('exposes initials virtual', () => {
    const user = new User({ name: 'John Doe', email: 'j@x.com', password: 'secret123' });
    expect(user.initials).toBe('JD');
  });

  it('has comparePassword method', () => {
    const user = new User({ name: 'A', email: 'a@b.com', password: 'x' });
    expect(typeof user.comparePassword).toBe('function');
  });

  it('creates a password reset token', () => {
    const user = new User({ name: 'A', email: 'a@b.com', password: 'x' });
    const raw = user.createPasswordResetToken();
    expect(typeof raw).toBe('string');
    expect(raw.length).toBeGreaterThan(10);
    expect(user.passwordResetToken).toBeDefined();
    expect(user.passwordResetExpires).toBeInstanceOf(Date);
  });

  it('toSafeObject strips sensitive fields', () => {
    const user = new User({ name: 'A', email: 'a@b.com', password: 'pass123' });
    const safe = user.toSafeObject();
    expect(safe.password).toBeUndefined();
    expect(safe.passwordResetToken).toBeUndefined();
  });
});

// ── Company ─────────────────────────────────────────────────
describe('Company model', () => {
  it('auto-generates apiKey and widgetId', () => {
    const c = new Company({ name: 'Acme', slug: 'acme', email: 'hi@acme.com' });
    expect(c.apiKey).toMatch(/^ak_/);
    expect(c.widgetId).toMatch(/^wid_/);
  });

  it('regenerates apiKey on demand', () => {
    const c = new Company({ name: 'Acme', slug: 'acme', email: 'hi@acme.com' });
    const old = c.apiKey;
    c.regenerateApiKey();
    expect(c.apiKey).not.toBe(old);
    expect(c.apiKey).toMatch(/^ak_/);
  });

  it('has default theme and widgetSettings', () => {
    const c = new Company({ name: 'X', slug: 'x', email: 'x@x.com' });
    expect(c.theme.primaryColor).toBe('#0ea5e9');
    expect(c.widgetSettings.position).toBe('bottom-right');
  });

  it('defaults plan to free', () => {
    const c = new Company({ name: 'X', slug: 'x', email: 'x@x.com' });
    expect(c.plan).toBe('free');
  });
});

// ── Subscription ─────────────────────────────────────────────
describe('Subscription model', () => {
  it('upgradePlan sets features from PLAN_LIMITS', () => {
    const s = new Subscription({ companyId: fakeId() });
    s.upgradePlan('pro');
    expect(s.plan).toBe('pro');
    expect(s.features.maxDocuments).toBe(PLAN_LIMITS.pro.maxDocuments);
  });

  it('isWithinChatLimit returns true for unlimited (-1)', () => {
    const s = new Subscription({ companyId: fakeId() });
    s.features.maxChatsPerMonth = -1;
    expect(s.isWithinChatLimit()).toBe(true);
  });

  it('isWithinChatLimit returns false when limit exceeded', () => {
    const s = new Subscription({ companyId: fakeId() });
    s.features.maxChatsPerMonth = 100;
    s.usage.chatsThisMonth = 100;
    expect(s.isWithinChatLimit()).toBe(false);
  });

  it('PLAN_LIMITS covers all four tiers', () => {
    ['free', 'starter', 'pro', 'enterprise'].forEach((tier) => {
      expect(PLAN_LIMITS[tier]).toBeDefined();
      expect(PLAN_LIMITS[tier].maxDocuments).toBeDefined();
    });
  });
});

// ── Document ─────────────────────────────────────────────────
describe('Document model', () => {
  it('fails validation without companyId', async () => {
    const doc = new Document({ name: 'test.pdf', fileType: 'pdf', uploadedBy: fakeId() });
    await expect(doc.validate()).rejects.toThrow();
  });

  it('fileSizeMB virtual works', () => {
    const doc = new Document({
      companyId: fakeId(),
      name: 'test.pdf',
      fileType: 'pdf',
      fileSize: 2 * 1024 * 1024,
      uploadedBy: fakeId(),
    });
    expect(doc.fileSizeMB).toBe('2.00');
  });

  it('defaults isDeleted to false', () => {
    const doc = new Document({
      companyId: fakeId(),
      name: 'x',
      fileType: 'txt',
      uploadedBy: fakeId(),
    });
    expect(doc.isDeleted).toBe(false);
  });
});

// ── Chunk ────────────────────────────────────────────────────
describe('Chunk model', () => {
  it('rejects embeddings with wrong dimension', async () => {
    const chunk = new Chunk({
      companyId: fakeId(),
      documentId: fakeId(),
      content: 'hello',
      embedding: new Array(512).fill(0),  // wrong: should be 1536
      chunkIndex: 0,
    });
    await expect(chunk.validate()).rejects.toThrow();
  });

  it('accepts embeddings with 1536 dimensions', async () => {
    const chunk = new Chunk({
      companyId: fakeId(),
      documentId: fakeId(),
      content: 'hello world',
      embedding: new Array(1536).fill(0.1),
      chunkIndex: 0,
    });
    await expect(chunk.validate()).resolves.toBeUndefined();
  });
});

// ── Conversation ─────────────────────────────────────────────
describe('Conversation model', () => {
  it('auto-generates sessionId with sess_ prefix', () => {
    const c = new Conversation({ companyId: fakeId(), widgetId: 'wid_abc' });
    expect(c.sessionId).toMatch(/^sess_/);
  });

  it('defaults status to active', () => {
    const c = new Conversation({ companyId: fakeId(), widgetId: 'wid_abc' });
    expect(c.status).toBe('active');
  });
});

// ── Message ──────────────────────────────────────────────────
describe('Message model', () => {
  it('fails validation without required fields', async () => {
    const m = new Message({});
    await expect(m.validate()).rejects.toThrow();
  });

  it('defaults sources to empty array', () => {
    const m = new Message({
      conversationId: fakeId(),
      companyId: fakeId(),
      role: 'user',
      content: 'Hello',
    });
    expect(m.sources).toEqual([]);
  });
});

// ── Analytics ────────────────────────────────────────────────
describe('Analytics model', () => {
  it('defaults hourlyChats to 24-element array of zeros', () => {
    const a = new Analytics({ companyId: fakeId(), date: new Date() });
    expect(a.hourlyChats).toHaveLength(24);
    expect(a.hourlyChats.every((n) => n === 0)).toBe(true);
  });
});

// ── Feedback ─────────────────────────────────────────────────
describe('Feedback model', () => {
  it('requires a valid rating enum value', async () => {
    const f = new Feedback({
      companyId: fakeId(),
      conversationId: fakeId(),
      messageId: fakeId(),
      rating: 'invalid_rating',
    });
    await expect(f.validate()).rejects.toThrow();
  });

  it('accepts thumbs_up and thumbs_down', async () => {
    for (const rating of ['thumbs_up', 'thumbs_down']) {
      const f = new Feedback({
        companyId: fakeId(),
        conversationId: fakeId(),
        messageId: fakeId(),
        rating,
      });
      await expect(f.validate()).resolves.toBeUndefined();
    }
  });
});
