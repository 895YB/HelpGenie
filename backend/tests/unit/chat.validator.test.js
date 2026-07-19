import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

process.env.NODE_ENV = 'test';

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const { validateChatMessage, validateSessionHistory } = await import('../../src/validators/chat.validator.js');
const errorMiddleware = (await import('../../src/middleware/error.middleware.js')).default;

function buildApp(middlewares) {
  const app = express();
  app.use(express.json());
  app.post('/test', ...middlewares, (_req, res) => res.json({ ok: true }));
  app.get('/test', ...middlewares, (_req, res) => res.json({ ok: true }));
  app.use(errorMiddleware);
  return app;
}

describe('validateChatMessage', () => {
  const app = buildApp(validateChatMessage);

  it('rejects a request missing widgetId and question', async () => {
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(
      expect.arrayContaining(['widgetId', 'question'])
    );
  });

  it('rejects a question over 2000 characters', async () => {
    const res = await request(app)
      .post('/test')
      .send({ widgetId: 'wid_1', question: 'a'.repeat(2001) });
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'question')).toBe(true);
  });

  it('rejects an invalid customerEmail', async () => {
    const res = await request(app)
      .post('/test')
      .send({ widgetId: 'wid_1', question: 'Hi', customerEmail: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'customerEmail')).toBe(true);
  });

  it('accepts a valid minimal payload', async () => {
    const res = await request(app).post('/test').send({ widgetId: 'wid_1', question: 'Hi' });
    expect(res.status).toBe(200);
  });
});

describe('validateSessionHistory', () => {
  const app = buildApp(validateSessionHistory);

  it('rejects a request missing sessionId', async () => {
    const res = await request(app).get('/test').query({ widgetId: 'wid_1' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('sessionId');
  });

  it('rejects a request missing widgetId', async () => {
    const res = await request(app).get('/test').query({ sessionId: 'sess_1' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('widgetId');
  });

  it('accepts a valid query', async () => {
    const res = await request(app).get('/test').query({ widgetId: 'wid_1', sessionId: 'sess_1' });
    expect(res.status).toBe(200);
  });
});
