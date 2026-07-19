/**
 * Unit tests for chatService.
 * All repositories, ragService, emailService, and Analytics are mocked.
 */

import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_32chars_minimum_length!';
process.env.OPENAI_API_KEY = 'sk-test';

// ── Mocks ─────────────────────────────────────────────────────

jest.unstable_mockModule('../../src/repositories/conversation.repository.js', () => ({
  conversationRepository: {
    create:             jest.fn(),
    findBySession:      jest.fn(),
    findByIdAndCompany: jest.fn(),
    updateById:         jest.fn(),
    incrementMessages:  jest.fn(),
    findByCompany:      jest.fn(),
    close:              jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/message.repository.js', () => ({
  messageRepository: {
    create:                    jest.fn(),
    findById:                  jest.fn(),
    findByIdAndConversation:   jest.fn(),
    findByConversation:        jest.fn(),
    getConversationHistory:    jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/subscription.repository.js', () => ({
  subscriptionRepository: {
    isWithinChatLimit:   jest.fn(),
    incrementChatUsage:  jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/services/rag.service.js', () => ({
  ragService: {
    query:       jest.fn(),
    queryStream: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/services/email.service.js', () => ({
  sendChatTranscript: jest.fn(),
}));

jest.unstable_mockModule('../../src/models/index.js', () => ({
  Analytics: { incrementDay: jest.fn(), incrementHour: jest.fn() },
  Feedback:  {
    findOne: jest.fn(),
    create:  jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Test data ─────────────────────────────────────────────────

import mongoose from 'mongoose';

const COMPANY_ID   = new mongoose.Types.ObjectId();
const CONV_ID      = new mongoose.Types.ObjectId();
const MSG_ID       = new mongoose.Types.ObjectId();

const COMPANY = {
  _id:            COMPANY_ID,
  name:           'Acme Corp',
  widgetId:       'wid_abc123',
  widgetSettings: { botName: 'Aria' },
};

const CONVERSATION = {
  _id:       CONV_ID,
  companyId: COMPANY_ID,
  sessionId: 'sess_test123',
  widgetId:  'wid_abc123',
};

const RAG_RESULT = {
  answer:             'Here is the answer.',
  sources:            [{ index: 1, documentName: 'Manual', excerpt: 'excerpt' }],
  answeredFromContext: true,
  tokensUsed:         { prompt: 100, completion: 20, total: 120 },
  responseTimeMs:     350,
};

// ── Module imports (after mocks) ──────────────────────────────

let chatService;
let conversationRepository;
let messageRepository;
let subscriptionRepository;
let ragService;
let sendChatTranscript;
let Analytics;
let Feedback;

beforeEach(async () => {
  jest.clearAllMocks();

  const chatMod  = await import('../../src/services/chat.service.js');
  const convMod  = await import('../../src/repositories/conversation.repository.js');
  const msgMod   = await import('../../src/repositories/message.repository.js');
  const subMod   = await import('../../src/repositories/subscription.repository.js');
  const ragMod   = await import('../../src/services/rag.service.js');
  const emailMod = await import('../../src/services/email.service.js');
  const modelMod = await import('../../src/models/index.js');

  chatService            = chatMod.chatService;
  conversationRepository = convMod.conversationRepository;
  messageRepository      = msgMod.messageRepository;
  subscriptionRepository = subMod.subscriptionRepository;
  ragService             = ragMod.ragService;
  sendChatTranscript     = emailMod.sendChatTranscript;
  Analytics              = modelMod.Analytics;
  Feedback               = modelMod.Feedback;
});

// ── sendMessage ───────────────────────────────────────────────

describe('chatService.sendMessage', () => {
  beforeEach(() => {
    subscriptionRepository.isWithinChatLimit.mockResolvedValue(true);
    conversationRepository.findBySession.mockResolvedValue(null);
    conversationRepository.create.mockResolvedValue(CONVERSATION);
    conversationRepository.incrementMessages.mockResolvedValue(CONVERSATION);
    messageRepository.getConversationHistory.mockResolvedValue([]);
    messageRepository.create.mockImplementation((data) => ({
      ...data,
      _id: MSG_ID,
    }));
    ragService.query.mockResolvedValue(RAG_RESULT);
  });

  it('creates a new conversation when no sessionId is provided', async () => {
    await chatService.sendMessage({
      question: 'How do I reset my password?',
      sessionId: undefined,
      company: COMPANY,
    });

    expect(conversationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: COMPANY_ID })
    );
  });

  it('reuses an existing conversation when sessionId matches', async () => {
    conversationRepository.findBySession.mockResolvedValue(CONVERSATION);

    await chatService.sendMessage({
      question:  'Follow-up question',
      sessionId: 'sess_test123',
      company:   COMPANY,
    });

    expect(conversationRepository.create).not.toHaveBeenCalled();
  });

  it('ignores a sessionId from a different company', async () => {
    const foreignConversation = {
      ...CONVERSATION,
      companyId: new mongoose.Types.ObjectId(), // different company
    };
    conversationRepository.findBySession.mockResolvedValue(foreignConversation);

    await chatService.sendMessage({
      question:  'Question',
      sessionId: 'sess_hijacked',
      company:   COMPANY,
    });

    // Should create a new conversation instead of using the foreign one
    expect(conversationRepository.create).toHaveBeenCalled();
  });

  it('throws 429 when subscription chat limit is exceeded', async () => {
    subscriptionRepository.isWithinChatLimit.mockResolvedValue(false);

    await expect(
      chatService.sendMessage({
        question: 'Test',
        company:  COMPANY,
      })
    ).rejects.toMatchObject({ statusCode: 429 });
  });

  it('saves a user message before calling RAG', async () => {
    const callOrder = [];
    messageRepository.create.mockImplementation((data) => {
      callOrder.push(`create:${data.role}`);
      return { ...data, _id: MSG_ID };
    });
    ragService.query.mockImplementation(async () => {
      callOrder.push('rag');
      return RAG_RESULT;
    });

    await chatService.sendMessage({ question: 'Test', company: COMPANY });

    expect(callOrder[0]).toBe('create:user');
    expect(callOrder[1]).toBe('rag');
  });

  it('saves an assistant message after RAG returns', async () => {
    await chatService.sendMessage({ question: 'Test', company: COMPANY });

    const calls = messageRepository.create.mock.calls;
    const assistantCall = calls.find(([d]) => d.role === 'assistant');
    expect(assistantCall).toBeDefined();
    expect(assistantCall[0].content).toBe(RAG_RESULT.answer);
  });

  it('increments conversation message count by 2', async () => {
    await chatService.sendMessage({ question: 'Test', company: COMPANY });
    expect(conversationRepository.incrementMessages).toHaveBeenCalledWith(CONV_ID, 2);
  });

  it('returns sessionId, messageId, and RAG fields', async () => {
    const result = await chatService.sendMessage({ question: 'Test', company: COMPANY });

    expect(result.sessionId).toBe(CONVERSATION.sessionId);
    expect(result.messageId).toBeDefined();
    expect(result.answer).toBe(RAG_RESULT.answer);
    expect(result.answeredFromContext).toBe(true);
    expect(result.sources).toHaveLength(1);
    expect(result.tokensUsed.total).toBe(120);
  });

  it('passes conversation history to ragService', async () => {
    const history = [
      { role: 'user', content: 'Previous question' },
      { role: 'assistant', content: 'Previous answer' },
    ];
    messageRepository.getConversationHistory.mockResolvedValue(history);

    await chatService.sendMessage({ question: 'Follow-up', company: COMPANY });

    expect(ragService.query).toHaveBeenCalledWith(
      expect.objectContaining({ conversationHistory: history })
    );
  });
});

// ── submitFeedback ────────────────────────────────────────────

describe('chatService.submitFeedback', () => {
  const MESSAGE_ID = new mongoose.Types.ObjectId();

  beforeEach(() => {
    conversationRepository.findBySession.mockResolvedValue(CONVERSATION);
    messageRepository.findByIdAndConversation.mockResolvedValue({
      _id: MESSAGE_ID, role: 'assistant', content: 'Answer', conversationId: CONV_ID,
    });
    Feedback.findOne.mockResolvedValue(null);
    Feedback.create.mockResolvedValue({ _id: new mongoose.Types.ObjectId(), rating: 'thumbs_up' });
  });

  it('creates feedback for a valid message', async () => {
    const feedback = await chatService.submitFeedback({
      sessionId: CONVERSATION.sessionId,
      messageId: MESSAGE_ID.toString(),
      rating:    'thumbs_up',
    });

    expect(Feedback.create).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 'thumbs_up', messageId: MESSAGE_ID.toString() })
    );
    expect(feedback).toBeDefined();
  });

  it('throws 404 when conversation is not found', async () => {
    conversationRepository.findBySession.mockResolvedValue(null);

    await expect(
      chatService.submitFeedback({
        sessionId: 'sess_nonexistent',
        messageId: MESSAGE_ID.toString(),
        rating:    'thumbs_up',
      })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 404 when message does not belong to the conversation', async () => {
    messageRepository.findByIdAndConversation.mockResolvedValue(null);

    await expect(
      chatService.submitFeedback({
        sessionId: CONVERSATION.sessionId,
        messageId: new mongoose.Types.ObjectId().toString(),
        rating:    'thumbs_down',
      })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('updates existing feedback instead of creating a duplicate', async () => {
    const existingFeedback = {
      _id:     new mongoose.Types.ObjectId(),
      rating:  'thumbs_up',
      comment: undefined,
      save:    jest.fn().mockResolvedValue(true),
    };
    Feedback.findOne.mockResolvedValue(existingFeedback);

    await chatService.submitFeedback({
      sessionId: CONVERSATION.sessionId,
      messageId: MESSAGE_ID.toString(),
      rating:    'thumbs_down',
      comment:   'Not helpful',
    });

    expect(existingFeedback.save).toHaveBeenCalled();
    expect(existingFeedback.rating).toBe('thumbs_down');
    expect(Feedback.create).not.toHaveBeenCalled();
  });
});

// ── emailTranscript ───────────────────────────────────────────

describe('chatService.emailTranscript', () => {
  beforeEach(() => {
    conversationRepository.findBySession.mockResolvedValue(CONVERSATION);
    messageRepository.findByConversation.mockResolvedValue([
      { role: 'user',      content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ]);
    sendChatTranscript.mockResolvedValue();
  });

  it('sends transcript email for a valid session', async () => {
    await chatService.emailTranscript({
      sessionId: CONVERSATION.sessionId,
      email:     'customer@example.com',
      company:   COMPANY,
    });

    expect(sendChatTranscript).toHaveBeenCalledWith(
      'customer@example.com',
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'Hello' }),
      ]),
      COMPANY.name
    );
  });

  it('throws 404 when session is not found', async () => {
    conversationRepository.findBySession.mockResolvedValue(null);

    await expect(
      chatService.emailTranscript({
        sessionId: 'sess_unknown',
        email:     'x@example.com',
        company:   COMPANY,
      })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 when conversation belongs to a different company', async () => {
    const foreignConv = { ...CONVERSATION, companyId: new mongoose.Types.ObjectId() };
    conversationRepository.findBySession.mockResolvedValue(foreignConv);

    await expect(
      chatService.emailTranscript({
        sessionId: CONVERSATION.sessionId,
        email:     'x@example.com',
        company:   COMPANY,
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

// ── getConversation (dashboard) ───────────────────────────────

describe('chatService.getConversation', () => {
  it('returns conversation and messages for the correct company', async () => {
    conversationRepository.findByIdAndCompany.mockResolvedValue(CONVERSATION);
    messageRepository.findByConversation.mockResolvedValue([
      { role: 'user', content: 'Hi' },
    ]);

    const result = await chatService.getConversation(COMPANY_ID, CONV_ID.toString());

    expect(result.conversation).toEqual(CONVERSATION);
    expect(result.messages).toHaveLength(1);
  });

  it('throws 404 when conversation does not exist for the company', async () => {
    conversationRepository.findByIdAndCompany.mockResolvedValue(null);

    await expect(
      chatService.getConversation(COMPANY_ID, new mongoose.Types.ObjectId().toString())
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
