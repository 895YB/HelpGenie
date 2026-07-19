import { chatService } from '../services/chat.service.js';
import ApiResponse from '../utils/apiResponse.js';
import { AppError } from '../middleware/error.middleware.js';

// ── Public widget endpoints ───────────────────────────────────

/**
 * POST /api/chat
 * Public REST endpoint for the chat widget (no JWT required).
 * req.company is injected by resolveWidgetTenant middleware.
 */
export async function sendMessage(req, res, next) {
  try {
    const { question, sessionId, customerEmail, customerName } = req.body;

    const result = await chatService.sendMessage({
      question,
      sessionId,
      company:      req.company,
      customerInfo: { email: customerEmail, name: customerName },
    });

    return ApiResponse.success(res, result, 'Message sent');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/chat/feedback/:messageId
 * Widget users submit thumbs up/down on assistant messages.
 */
export async function submitFeedback(req, res, next) {
  try {
    const { messageId } = req.params;
    const { sessionId, rating, comment } = req.body;

    const feedback = await chatService.submitFeedback({
      sessionId,
      messageId,
      rating,
      comment,
    });

    return ApiResponse.success(res, { feedback }, 'Feedback recorded');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/chat/transcript
 * Emails a full conversation transcript to the customer.
 * req.company injected by resolveWidgetTenant.
 */
export async function emailTranscript(req, res, next) {
  try {
    const { sessionId, email } = req.body;

    await chatService.emailTranscript({
      sessionId,
      email,
      company: req.company,
    });

    return ApiResponse.success(res, null, 'Transcript sent to ' + email);
  } catch (err) {
    next(err);
  }
}

// ── Dashboard endpoints (auth required) ──────────────────────

/**
 * GET /api/chat/conversations
 * Returns paginated conversation list for the authenticated company.
 */
export async function listConversations(req, res, next) {
  try {
    const { page, limit, status } = req.query;

    const result = await chatService.listConversations(req.companyId, {
      page:   parseInt(page)  || 1,
      limit:  parseInt(limit) || 20,
      status,
    });

    return ApiResponse.paginated(
      res,
      result.conversations,
      {
        total:      result.total,
        page:       result.page,
        limit:      result.limit,
        totalPages: result.totalPages,
      },
      'Conversations retrieved'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/chat/conversations/:id
 * Returns a single conversation with its full message thread.
 */
export async function getConversationDetails(req, res, next) {
  try {
    const { id } = req.params;
    const data = await chatService.getConversation(req.companyId, id);
    return ApiResponse.success(res, data, 'Conversation retrieved');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/chat/conversations/:id
 * Closes (soft-closes) a conversation from the dashboard.
 */
export async function closeConversation(req, res, next) {
  try {
    const { id } = req.params;

    const { conversationRepository } = await import('../repositories/conversation.repository.js');
    const conversation = await conversationRepository.findByIdAndCompany(id, req.companyId);
    if (!conversation) throw AppError.notFound('Conversation not found');

    await conversationRepository.close(id);
    return ApiResponse.noContent(res);
  } catch (err) {
    next(err);
  }
}
