/**
 * Socket.io server — real-time streaming chat for the embeddable widget.
 *
 * Protocol:
 *   Client → 'chat:message'  { widgetId, question, sessionId?, customerEmail?, customerName? }
 *   Server → 'chat:chunk'    { token, sessionId }       — one per streamed token
 *   Server → 'chat:done'     { sessionId, messageId, answer, sources, answeredFromContext, ... }
 *   Server → 'chat:error'    { message }
 *
 * Rate limit: 60 messages/min per socket (in-memory, resets on disconnect).
 */

import { Server } from 'socket.io';
import { Company } from '../models/index.js';
import { chatService } from '../services/chat.service.js';
import logger from '../utils/logger.js';

const RATE_LIMIT_MAX       = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;

// Per-socket rate limit state (cleared on disconnect)
const rateLimitMap = new Map();

function isRateLimited(socketId) {
  const now   = Date.now();
  const entry = rateLimitMap.get(socketId) ?? { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count   = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  entry.count++;
  rateLimitMap.set(socketId, entry);
  return entry.count > RATE_LIMIT_MAX;
}

// ── Exported initialiser ──────────────────────────────────────

export function initSocket(httpServer) {
  const allowedOrigins = [
    process.env.CLIENT_URL,
    ...(process.env.WIDGET_ALLOWED_ORIGINS?.split(',').map((s) => s.trim()) ?? []),
  ].filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      // Fall back to '*' in dev when no origins are configured
      origin:      allowedOrigins.length > 0 ? allowedOrigins : '*',
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    transports:   ['websocket', 'polling'],
    pingTimeout:  60_000,
    pingInterval: 25_000,
  });

  io.on('connection', (socket) => {
    const clientIp =
      socket.handshake.headers['x-forwarded-for'] ?? socket.handshake.address;
    logger.info(`[Socket] connected  id=${socket.id} ip=${clientIp}`);

    // Join a room scoped to the session for future multi-tab support
    socket.on('chat:join', ({ sessionId } = {}) => {
      if (sessionId) {
        socket.join(`session:${sessionId}`);
        logger.info(`[Socket] ${socket.id} joined session:${sessionId}`);
      }
    });

    socket.on('chat:message', async (data) => {
      if (isRateLimited(socket.id)) {
        socket.emit('chat:error', { message: 'Too many messages. Please wait a moment.' });
        return;
      }

      const { widgetId, question, sessionId, customerEmail, customerName } = data ?? {};

      if (!widgetId || !question?.trim()) {
        socket.emit('chat:error', { message: 'widgetId and question are required.' });
        return;
      }

      try {
        const company = await Company.findByWidgetId(widgetId);
        if (!company) {
          socket.emit('chat:error', { message: 'Invalid widget ID.' });
          return;
        }

        await chatService.sendMessageStream({
          question:     question.trim(),
          sessionId,
          company,
          customerInfo: { email: customerEmail, name: customerName },
          socket,
        });
      } catch (err) {
        logger.error(`[Socket] Chat error for ${socket.id}: ${err.message}`);
        socket.emit('chat:error', {
          message:
            err.statusCode === 429
              ? 'Monthly chat limit reached. Please contact support.'
              : 'Failed to process your message. Please try again.',
        });
      }
    });

    // Optional: forward typing indicators to the same session room
    socket.on('chat:typing', ({ sessionId, isTyping } = {}) => {
      if (sessionId) {
        socket.to(`session:${sessionId}`).emit('chat:typing', { isTyping });
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket] disconnected id=${socket.id} reason=${reason}`);
      rateLimitMap.delete(socket.id);
    });
  });

  return io;
}
