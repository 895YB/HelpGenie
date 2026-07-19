import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';

jest.unstable_mockModule('../../src/services/chat.service.js', () => ({
  chatService: {
    sendMessage: jest.fn(),
    submitFeedback: jest.fn(),
    emailTranscript: jest.fn(),
    getSessionHistory: jest.fn(),
    listConversations: jest.fn(),
    getConversation: jest.fn(),
  },
}));

const { chatService } = await import('../../src/services/chat.service.js');
const { sendMessage, submitFeedback, getSessionHistory } = await import(
  '../../src/controllers/chat.controller.js'
);

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('chat.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('sendMessage', () => {
    it('calls chatService.sendMessage with the resolved company and body fields', async () => {
      const company = { _id: 'co1', widgetId: 'wid_1' };
      chatService.sendMessage.mockResolvedValue({ sessionId: 'sess_1', answer: 'Hi!' });

      const req = {
        body: { question: 'Hello', sessionId: undefined, customerEmail: 'a@b.com', customerName: 'Ann' },
        company,
      };
      const res = mockRes();
      const next = jest.fn();

      await sendMessage(req, res, next);

      expect(chatService.sendMessage).toHaveBeenCalledWith({
        question: 'Hello',
        sessionId: undefined,
        company,
        customerInfo: { email: 'a@b.com', name: 'Ann' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { sessionId: 'sess_1', answer: 'Hi!' } })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards service errors to next()', async () => {
      const err = new Error('boom');
      chatService.sendMessage.mockRejectedValue(err);

      const req = { body: {}, company: {} };
      const res = mockRes();
      const next = jest.fn();

      await sendMessage(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('submitFeedback', () => {
    it('passes messageId from params and rating/comment/sessionId from body', async () => {
      chatService.submitFeedback.mockResolvedValue({ rating: 'thumbs_up' });

      const req = {
        params: { messageId: 'msg_1' },
        body: { sessionId: 'sess_1', rating: 'thumbs_up', comment: 'Great!' },
      };
      const res = mockRes();
      const next = jest.fn();

      await submitFeedback(req, res, next);

      expect(chatService.submitFeedback).toHaveBeenCalledWith({
        sessionId: 'sess_1',
        messageId: 'msg_1',
        rating: 'thumbs_up',
        comment: 'Great!',
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getSessionHistory', () => {
    it("returns the resolved company's session history, scoped by companyId", async () => {
      const history = { conversationId: 'conv_1', messages: [] };
      chatService.getSessionHistory.mockResolvedValue(history);

      const req = { query: { sessionId: 'sess_1' }, company: { _id: 'co1' } };
      const res = mockRes();
      const next = jest.fn();

      await getSessionHistory(req, res, next);

      expect(chatService.getSessionHistory).toHaveBeenCalledWith('co1', 'sess_1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: history }));
    });

    it('forwards errors to next()', async () => {
      const err = new Error('boom');
      chatService.getSessionHistory.mockRejectedValue(err);

      const req = { query: { sessionId: 'sess_1' }, company: { _id: 'co1' } };
      const res = mockRes();
      const next = jest.fn();

      await getSessionHistory(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
