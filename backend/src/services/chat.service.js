/**
 * Chat Service — orchestrates the full chat lifecycle:
 *   1. Enforce subscription chat limits
 *   2. Get or create a conversation (by sessionId)
 *   3. Fetch conversation history for RAG context
 *   4. Save the user message
 *   5. Call ragService (streaming or blocking)
 *   6. Save the assistant message
 *   7. Update conversation metadata (messageCount, lastMessageAt)
 *   8. Track analytics (non-blocking)
 *   9. Increment subscription usage
 *
 * This service is stateless — it owns no sockets and knows nothing about HTTP.
 * The controller and Socket.io handler adapt its output to their transports.
 */

import { conversationRepository } from '../repositories/conversation.repository.js';
import { messageRepository } from '../repositories/message.repository.js';
import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { ragService } from './rag.service.js';
import { sendChatTranscript } from './email.service.js';
import { Analytics, Feedback } from '../models/index.js';
import { AppError } from '../middleware/error.middleware.js';
import { sanitizeChatMessage } from '../utils/sanitizer.js';
import logger from '../utils/logger.js';

// ── Public API ────────────────────────────────────────────────

export const chatService = {
  /**
   * Non-streaming send — returns complete answer.
   * Used by the REST /api/chat endpoint as fallback for clients
   * that can't use WebSockets.
   */
  async sendMessage({ question, sessionId, company, customerInfo = {} }) {
    await _checkChatLimit(company);

    const conversation = await _getOrCreateConversation({
      companyId: company._id,
      widgetId:  company.widgetId,
      sessionId,
      customerInfo,
    });

    const history = await messageRepository.getConversationHistory(conversation._id);
    await messageRepository.create(_userMessage(conversation, company._id, question));

    const result = await ragService.query({
      question,
      companyId: company._id,
      company,
      conversationHistory: history,
    });

    const assistantMsg = await messageRepository.create(
      _assistantMessage(conversation, company._id, result)
    );

    await conversationRepository.incrementMessages(conversation._id, 2);
    setImmediate(() => _postChatTasks(company._id, result));

    return {
      sessionId: conversation.sessionId,
      conversationId: conversation._id,
      messageId: assistantMsg._id,
      answer: result.answer,
      sources: result.sources,
      answeredFromContext: result.answeredFromContext,
      tokensUsed: result.tokensUsed,
      responseTimeMs: result.responseTimeMs,
    };
  },

  /**
   * Streaming send — emits tokens via the socket as they arrive.
   * The socket is passed in so the service stays decoupled from Socket.io.
   */
  async sendMessageStream({ question, sessionId, company, customerInfo = {}, socket }) {
    await _checkChatLimit(company);

    const conversation = await _getOrCreateConversation({
      companyId: company._id,
      widgetId:  company.widgetId,
      sessionId,
      customerInfo,
    });

    const history = await messageRepository.getConversationHistory(conversation._id);
    await messageRepository.create(_userMessage(conversation, company._id, question));

    await ragService.queryStream({
      question,
      companyId: company._id,
      company,
      conversationHistory: history,

      onChunk: (token) => {
        socket.emit('chat:chunk', { token, sessionId: conversation.sessionId });
      },

      onComplete: async (result) => {
        try {
          const assistantMsg = await messageRepository.create(
            _assistantMessage(conversation, company._id, result)
          );

          await conversationRepository.incrementMessages(conversation._id, 2);
          setImmediate(() => _postChatTasks(company._id, result));

          socket.emit('chat:done', {
            sessionId:          conversation.sessionId,
            conversationId:     conversation._id.toString(),
            messageId:          assistantMsg._id.toString(),
            answer:             result.answer,
            sources:            result.sources,
            answeredFromContext: result.answeredFromContext,
            tokensUsed:         result.tokensUsed,
            responseTimeMs:     result.responseTimeMs,
          });
        } catch (saveErr) {
          logger.error(`[Chat] Failed to save assistant message: ${saveErr.message}`);
          socket.emit('chat:error', { message: 'Failed to save response. Please try again.' });
        }
      },

      onError: (err) => {
        logger.error(`[Chat] RAG stream error: ${err.message}`);
        socket.emit('chat:error', { message: 'Failed to generate response. Please try again.' });
      },
    });

    return conversation.sessionId;
  },

  // ── Feedback ────────────────────────────────────────────────

  async submitFeedback({ sessionId, messageId, rating, comment }) {
    const conversation = await conversationRepository.findBySession(sessionId);
    if (!conversation) {throw AppError.notFound('Conversation not found');}

    const message = await messageRepository.findByIdAndConversation(
      messageId,
      conversation._id
    );
    if (!message) {throw AppError.notFound('Message not found');}

    const existing = await Feedback.findOne({ messageId });
    if (existing) {
      existing.rating  = rating;
      existing.comment = comment;
      await existing.save();
      return existing;
    }

    return Feedback.create({
      companyId:      conversation.companyId,
      conversationId: conversation._id,
      messageId,
      rating,
      comment,
    });
  },

  // ── Transcript email ────────────────────────────────────────

  async emailTranscript({ sessionId, email, company }) {
    const conversation = await conversationRepository.findBySession(sessionId);
    if (!conversation) {throw AppError.notFound('Conversation not found');}

    if (conversation.companyId.toString() !== company._id.toString()) {
      throw AppError.forbidden('Access denied');
    }

    const messages = await messageRepository.findByConversation(conversation._id);

    await sendChatTranscript(
      email,
      messages.map((m) => ({ role: m.role, content: m.content })),
      company.name
    );
  },

  // ── Dashboard queries ───────────────────────────────────────

  async listConversations(companyId, filters) {
    return conversationRepository.findByCompany(companyId, filters);
  },

  async getConversation(companyId, conversationId) {
    const conversation = await conversationRepository.findByIdAndCompany(
      conversationId,
      companyId
    );
    if (!conversation) {throw AppError.notFound('Conversation not found');}

    const messages = await messageRepository.findByConversation(conversationId);
    return { conversation, messages };
  },

  // ── Widget session restore ──────────────────────────────────

  /**
   * Public, unauthenticated — lets the widget rehydrate a prior conversation
   * after a page refresh, given the sessionId it persisted client-side.
   * Scoped to companyId (same anti-spoofing check as _getOrCreateConversation)
   * so one company's widgetId can never read another's session.
   */
  async getSessionHistory(companyId, sessionId) {
    const conversation = await conversationRepository.findBySession(sessionId);
    if (!conversation || conversation.companyId.toString() !== companyId.toString()) {
      return { conversationId: null, messages: [] };
    }

    const [messages, feedbackDocs] = await Promise.all([
      messageRepository.findByConversation(conversation._id),
      Feedback.find({ conversationId: conversation._id }),
    ]);

    const feedbackByMessage = new Map(
      feedbackDocs.map((f) => [f.messageId.toString(), f.rating])
    );

    return {
      conversationId: conversation._id,
      messages: messages.map((m) => ({
        id: m._id,
        role: m.role,
        content: m.content,
        sources: m.sources,
        createdAt: m.createdAt,
        feedback: feedbackByMessage.get(m._id.toString()) || null,
      })),
    };
  },
};

// ── Private helpers ───────────────────────────────────────────

async function _checkChatLimit(company) {
  const withinLimit = await subscriptionRepository.isWithinChatLimit(company._id);
  if (!withinLimit) {
    throw AppError.tooMany('Monthly chat limit reached. Please upgrade your plan.');
  }
}

async function _getOrCreateConversation({ companyId, widgetId, sessionId, customerInfo }) {
  if (sessionId) {
    const existing = await conversationRepository.findBySession(sessionId);
    // Return existing only if it belongs to the same company (prevents sessionId spoofing)
    if (existing && existing.companyId.toString() === companyId.toString()) {
      return existing;
    }
  }

  return conversationRepository.create({
    companyId,
    widgetId,
    customerEmail: customerInfo.email,
    customerName:  customerInfo.name,
  });
}

function _userMessage(conversation, companyId, question) {
  return {
    conversationId: conversation._id,
    companyId,
    role:    'user',
    content: sanitizeChatMessage(question),
  };
}

function _assistantMessage(conversation, companyId, result) {
  return {
    conversationId:     conversation._id,
    companyId,
    role:               'assistant',
    content:            result.answer,
    sources:            result.sources,
    tokensUsed:         result.tokensUsed,
    responseTimeMs:     result.responseTimeMs,
    answeredFromContext: result.answeredFromContext,
  };
}

// Runs after the HTTP/socket response — failures never affect the user
async function _postChatTasks(companyId, result) {
  try {
    await subscriptionRepository.incrementChatUsage(companyId);
  } catch (err) {
    logger.error(`[Chat] Failed to increment usage: ${err.message}`);
  }

  try {
    const now  = new Date();
    const hour = now.getUTCHours();

    await Analytics.incrementDay(companyId, now, {
      totalChats:          1,
      totalResponseTimeMs: result.responseTimeMs,
      totalTokensUsed:     result.tokensUsed.total,
      promptTokens:        result.tokensUsed.prompt,
      completionTokens:    result.tokensUsed.completion,
      ...(result.answeredFromContext
        ? { answeredFromContext: 1 }
        : { fallbackResponses:  1 }),
    });

    await Analytics.incrementHour(companyId, now, hour);
  } catch (err) {
    logger.error(`[Chat] Failed to track analytics: ${err.message}`);
  }
}
