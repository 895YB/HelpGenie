/**
 * API-level tests for auth routes using supertest.
 * These tests mount the Express app without starting a real server
 * and without a real DB — all service calls are mocked at the module level.
 */

import { jest } from '@jest/globals';
import request from 'supertest';

// ── Environment ───────────────────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_access_secret_minimum_32_chars!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_minimum_32_chars!';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'; // won't be used — DB is mocked
process.env.OPENAI_API_KEY = 'sk-test-placeholder';           // won't be used — OpenAI is mocked
process.env.CLIENT_URL = 'http://localhost:5173';

// ── Mock DB connection so app.js doesn't try to connect ──────
jest.unstable_mockModule('../../src/config/database.js', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}));

// ── Mock Socket.io so initSocket doesn't bind to http server ─
jest.unstable_mockModule('../../src/config/socket.js', () => ({
  initSocket: jest.fn().mockReturnValue({ on: jest.fn() }),
}));

// ── Mock OpenAI client so API key is not required in tests ───
jest.unstable_mockModule('../../src/config/openai.js', () => ({
  default: { chat: { completions: { create: jest.fn() } }, embeddings: { create: jest.fn() } },
}));

// ── Mock chat service (so chat routes don't fail to link) ────
jest.unstable_mockModule('../../src/services/chat.service.js', () => ({
  chatService: {
    sendMessage:        jest.fn(),
    sendMessageStream:  jest.fn(),
    submitFeedback:     jest.fn(),
    emailTranscript:    jest.fn(),
    listConversations:  jest.fn(),
    getConversation:    jest.fn(),
  },
}));

// ── Mock auth service ─────────────────────────────────────────
const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshTokens: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  verifyEmail: jest.fn(),
  getMe: jest.fn(),
  changePassword: jest.fn(),
};

jest.unstable_mockModule('../../src/services/auth.service.js', () => ({
  authService: mockAuthService,
}));

// ── Mock auth middleware (so /me doesn't need a real token) ──
jest.unstable_mockModule('../../src/middleware/auth.middleware.js', () => ({
  authenticate: jest.fn((req, _res, next) => {
    req.user = { _id: 'user123', isActive: true };
    req.userId = 'user123';
    req.companyId = 'company123';
    req.userRole = 'admin';
    next();
  }),
  optionalAuthenticate: jest.fn((_req, _res, next) => next()),
}));

// ── Mock all models (ESM requires all named exports to be present) ──
jest.unstable_mockModule('../../src/models/index.js', () => ({
  User:         { findById: jest.fn() },
  Company:      { findByWidgetId: jest.fn(), findByApiKey: jest.fn() },
  Subscription: { findOne: jest.fn() },
  Document:     {},
  Chunk:        {},
  Conversation: {},
  Message:      {},
  Analytics:    { incrementDay: jest.fn(), incrementHour: jest.fn() },
  Feedback:     { findOne: jest.fn(), create: jest.fn() },
}));

let app;

beforeAll(async () => {
  const mod = await import('../../src/app.js');
  app = mod.app;
});

beforeEach(() => jest.clearAllMocks());

// ── POST /api/auth/register ───────────────────────────────────
describe('POST /api/auth/register', () => {
  const valid = {
    name: 'Alice Smith',
    email: 'alice@example.com',
    password: 'Password1!',
    companyName: 'Acme',
  };

  it('returns 201 on success', async () => {
    mockAuthService.register.mockResolvedValue({
      user: { id: '1', name: 'Alice Smith' },
      accessToken: 'access.token.here',
      refreshToken: 'refresh.token.here',
    });

    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBe('access.token.here');
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...valid, email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when password is too weak', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...valid, password: 'short' });
    expect(res.status).toBe(400);
  });

  it('returns 409 when email already exists', async () => {
    const { AppError } = await import('../../src/middleware/error.middleware.js');
    mockAuthService.register.mockRejectedValue(AppError.conflict('Email already in use'));

    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(409);
  });
});

// ── POST /api/auth/login ──────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('returns 200 + accessToken on valid credentials', async () => {
    mockAuthService.login.mockResolvedValue({
      user: { id: '1' },
      accessToken: 'acc',
      refreshToken: 'ref',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'Password1!' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBe('acc');
    // Refresh token must arrive as a cookie, not in the body
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 on bad credentials', async () => {
    const { AppError } = await import('../../src/middleware/error.middleware.js');
    mockAuthService.login.mockRejectedValue(AppError.unauthorized('Invalid email or password'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'Wrong1!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: '' });
    expect(res.status).toBe(400);
  });
});

// ── POST /api/auth/forgot-password ───────────────────────────
describe('POST /api/auth/forgot-password', () => {
  it('always returns 200 to prevent user enumeration', async () => {
    mockAuthService.forgotPassword.mockResolvedValue(undefined);
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'anyone@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────
describe('GET /api/auth/me', () => {
  it('returns the authenticated user', async () => {
    mockAuthService.getMe.mockResolvedValue({ id: 'user123', name: 'Alice' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer fake.token');

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Alice');
  });
});

// ── GET /api/health ───────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns 200 ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ── 404 handler ───────────────────────────────────────────────
describe('Unknown route', () => {
  it('returns 404 for undefined routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
