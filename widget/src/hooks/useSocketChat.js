import { useCallback, useEffect, useRef, useState } from 'react';
import { createSocket } from '../lib/socket.js';
import { api } from '../lib/api.js';
import { storage } from '../lib/storage.js';

/**
 * Owns the socket lifecycle, message state, and conversation persistence.
 *
 * The sessionId is read from localStorage on mount and reused on every
 * request (chat:join, chat:message) so a page refresh continues the same
 * server-side Conversation; when the socket returns a *new* sessionId
 * (first-ever message) it's written back to localStorage immediately.
 */
export function useSocketChat({ widgetId }) {
  /** @type {[import('../types').ChatMessage[], Function]} */
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const sessionIdRef = useRef(storage.getSessionId(widgetId));
  const socketRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    if (sessionIdRef.current) {
      api
        .getSessionHistory(widgetId, sessionIdRef.current)
        .then((history) => {
          if (!cancelled && history?.messages?.length) {
            setMessages(history.messages);
          }
        })
        .catch(() => {
          // Session gone/expired server-side (e.g. cleared DB) — start fresh;
          // the stored sessionId will simply be replaced on the next chat:done.
        });
    }

    const socket = createSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      if (cancelled) return;
      setIsConnected(true);
      if (sessionIdRef.current) {
        socket.emit('chat:join', { sessionId: sessionIdRef.current });
      }
    });

    socket.on('disconnect', () => {
      if (!cancelled) setIsConnected(false);
    });

    socket.on('chat:chunk', ({ token }) => {
      if (cancelled) return;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last?.streaming) return prev;
        const next = prev.slice(0, -1);
        next.push({ ...last, content: last.content + token });
        return next;
      });
    });

    socket.on('chat:done', (/** @type {import('../types').ChatDonePayload} */ payload) => {
      if (cancelled) return;

      if (payload.sessionId && payload.sessionId !== sessionIdRef.current) {
        sessionIdRef.current = payload.sessionId;
        storage.setSessionId(widgetId, payload.sessionId);
      }

      const finalized = {
        id: payload.messageId,
        role: 'assistant',
        content: payload.answer,
        sources: payload.sources,
        answeredFromContext: payload.answeredFromContext,
        responseTimeMs: payload.responseTimeMs,
        createdAt: new Date().toISOString(),
        feedback: null,
      };

      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.streaming);
        if (idx === -1) return [...prev, finalized];
        const next = [...prev];
        next[idx] = finalized;
        return next;
      });
      setIsStreaming(false);
    });

    socket.on('chat:error', ({ message }) => {
      if (cancelled) return;
      setError(message || 'Something went wrong. Please try again.');
      setIsStreaming(false);
      setMessages((prev) => prev.filter((m) => !m.streaming));
    });

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, [widgetId]);

  const sendMessage = useCallback(
    (question) => {
      const socket = socketRef.current;
      const trimmed = question.trim();
      if (!socket || !trimmed || isStreaming) return;

      setError(null);
      setIsStreaming(true);

      const now = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        { id: null, role: 'user', content: trimmed, createdAt: now },
        { id: null, role: 'assistant', content: '', createdAt: now, streaming: true },
      ]);

      socket.emit('chat:message', {
        widgetId,
        question: trimmed,
        sessionId: sessionIdRef.current || undefined,
      });
    },
    [widgetId, isStreaming]
  );

  const sendFeedback = useCallback(async (messageId, rating) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m)));
    try {
      await api.sendFeedback({ messageId, sessionId: sessionIdRef.current, rating });
    } catch {
      // best-effort — the UI already reflects the chosen rating
    }
  }, []);

  const sendTranscript = useCallback((email) => {
    return api.sendTranscript({ sessionId: sessionIdRef.current, email });
  }, []);

  return { messages, sendMessage, sendFeedback, sendTranscript, isConnected, isStreaming, error };
}
