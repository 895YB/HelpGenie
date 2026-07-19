/**
 * Integration test — exercises the full public chat request pipeline through
 * supertest: validator -> resolveWidgetTenant -> chat.controller (real) ->
 * chat.service (real) -> repositories (mocked) -> ragService (mocked, stands
 * in for the OpenAI call, same boundary chat.service.test.js mocks at).
 *
 * This is the gap chat.routes.js otherwise has zero coverage for: the routing
 * + middleware + validation + controller + service wiring all working together.
 */
import { jest } from '@jest/globals';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_access_secret_minimum_32_chars!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_minimum_32_chars!';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'; // never used — DB is mocked
process.env.OPENAI_API_KEY = 'sk-test-placeholder';          // never used — ragService is mocked
process.env.CLIENT_URL = 'http://localhost:5173';

jest.unstable_mockModule('../../src/config/database.js', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../../src/config/socket.js', () => ({
  initSocket: jest.fn().mockReturnValue({ on: jest.fn() }),
}));

jest.unstable_mockModule('../../src/config/openai.js', () => ({
  default: { chat: { completions: { create: jest.fn() } }, embeddings: { create: jest.fn() } },
}));

const MOCK_COMPANY = {
  _id: 'co1',
  widgetId: 'wid_integration',
  isActive: true,
  name: 'Acme Corp',
  widgetSettings: { botName: 'Support Assistant' },
};

jest.unstable_mockModule('../../src/models/index.js', () => ({
  User: {},
  Company: {
    findByWidgetId: jest.fn((widgetId) =>
      Promise.resolve(widgetId === MOCK_COMPANY.widgetId ? MOCK_COMPANY : null)
    ),
    findByApiKey: jest.fn(),
  },
  Subscription: { findOne: jest.fn() },
  Document: {},
  Chunk: {},
  Conversation: {},
  Message: {},
  Analytics: {
    incrementDay: jest.fn().mockResolvedValue(undefined),
    incrementHour: jest.fn().mockResolvedValue(undefined),
  },
  Feedback: { findOne: jest.fn(), create: jest.fn(), find: jest.fn().mockResolvedValue([]) },
}));

const createdMessages = [];

jest.unstable_mockModule('../../src/repositories/conversation.repository.js', () => ({
  conversationRepository: {
    create: jest.fn((data) =>
      Promise.resolve({ _id: 'conv_1', sessionId: 'sess_new_1', companyId: data.companyId })
    ),
    findBySession: jest.fn(() => Promise.resolve(null)),
    incrementMessages: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.unstable_mockModule('../../src/repositories/message.repository.js', () => ({
  messageRepository: {
    create: jest.fn((data) => {
      const msg = { _id: `msg_${createdMessages.length + 1}`, ...data };
      createdMessages.push(msg);
      return Promise.resolve(msg);
    }),
    getConversationHistory: jest.fn().mockResolvedValue([]),
    findByConversation: jest.fn(() => Promise.resolve(createdMessages)),
  },
}));

jest.unstable_mockModule('../../src/repositories/subscription.repository.js', () => ({
  subscriptionRepository: {
    isWithinChatLimit: jest.fn().mockResolvedValue(true),
    incrementChatUsage: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.unstable_mockModule('../../src/services/rag.service.js', () => ({
  ragService: {
    query: jest.fn().mockResolvedValue({
      answer: 'Our refund window is 30 days.',
      sources: [
        {
          chunkId: 'c1',
          documentId: 'd1',
          documentName: 'Refund Policy',
          excerpt: '30-day refunds from purchase date.',
          score: 0.91,
        },
      ],
      answeredFromContext: true,
      tokensUsed: { prompt: 120, completion: 40, total: 160 },
      responseTimeMs: 350,
    }),
    queryStream: jest.fn(),
  },
}));

let app;

beforeAll(async () => {
  const mod = await import('../../src/app.js');
  app = mod.app;
});

beforeEach(() => {
  createdMessages.length = 0;
  jest.clearAllMocks();
});

describe('POST /api/chat (integration)', () => {
  it('resolves the widget, runs the RAG pipeline, and persists user + assistant messages', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ widgetId: 'wid_integration', question: 'What is your refund policy?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.answer).toBe('Our refund window is 30 days.');
    expect(res.body.data.sources).toHaveLength(1);
    expect(res.body.data.sessionId).toBe('sess_new_1');

    expect(createdMessages).toHaveLength(2);
    expect(createdMessages[0]).toMatchObject({ role: 'user', content: 'What is your refund policy?' });
    expect(createdMessages[1]).toMatchObject({ role: 'assistant', content: 'Our refund window is 30 days.' });
  });

  it('returns 404 for an unknown widgetId', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ widgetId: 'wid_does_not_exist', question: 'Hello?' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(createdMessages).toHaveLength(0);
  });

  it('returns 400 when the question is missing', async () => {
    const res = await request(app).post('/api/chat').send({ widgetId: 'wid_integration' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/chat/history (integration)', () => {
  it('returns the conversationId and messages for a known session', async () => {
    const { conversationRepository } = await import('../../src/repositories/conversation.repository.js');
    conversationRepository.findBySession.mockResolvedValue({
      _id: 'conv_1',
      companyId: 'co1',
    });
    const { messageRepository } = await import('../../src/repositories/message.repository.js');
    messageRepository.findByConversation.mockResolvedValue([
      { _id: 'msg_1', role: 'user', content: 'Hi', sources: [], createdAt: new Date() },
    ]);

    const res = await request(app)
      .get('/api/chat/history')
      .query({ widgetId: 'wid_integration', sessionId: 'sess_new_1' });

    expect(res.status).toBe(200);
    expect(res.body.data.conversationId).toBe('conv_1');
    expect(res.body.data.messages).toHaveLength(1);
  });

  it('returns 400 when sessionId is missing', async () => {
    const res = await request(app).get('/api/chat/history').query({ widgetId: 'wid_integration' });
    expect(res.status).toBe(400);
  });
});
