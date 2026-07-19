import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Simple in-memory event bus standing in for a real socket.io-client Socket.
const handlers = {};
function fakeSocket() {
  return {
    on: vi.fn((event, cb) => {
      handlers[event] = cb;
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
}

vi.mock('../../src/lib/socket.js', () => ({
  createSocket: vi.fn(() => fakeSocket()),
}));

vi.mock('../../src/lib/api.js', () => ({
  api: {
    getSessionHistory: vi.fn(),
    sendFeedback: vi.fn(),
    sendTranscript: vi.fn(),
  },
}));

vi.mock('../../src/lib/storage.js', () => ({
  storage: {
    getSessionId: vi.fn(),
    setSessionId: vi.fn(),
  },
}));

const { useSocketChat } = await import('../../src/hooks/useSocketChat.js');
const { api } = await import('../../src/lib/api.js');
const { storage } = await import('../../src/lib/storage.js');
const { createSocket } = await import('../../src/lib/socket.js');

describe('useSocketChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(handlers)) delete handlers[key];
    storage.getSessionId.mockReturnValue(null);
    api.getSessionHistory.mockResolvedValue({ conversationId: null, messages: [] });
  });

  it('hydrates messages from session history when a sessionId is already stored', async () => {
    storage.getSessionId.mockReturnValue('sess_123');
    api.getSessionHistory.mockResolvedValue({
      conversationId: 'conv_1',
      messages: [{ id: 'm1', role: 'user', content: 'hi', createdAt: new Date().toISOString() }],
    });

    const { result } = renderHook(() => useSocketChat({ widgetId: 'wid_1' }));

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(api.getSessionHistory).toHaveBeenCalledWith('wid_1', 'sess_123');
  });

  it('joins the restored session room once the socket connects', () => {
    storage.getSessionId.mockReturnValue('sess_123');
    renderHook(() => useSocketChat({ widgetId: 'wid_1' }));

    const socket = createSocket.mock.results.at(-1).value;
    act(() => handlers['connect']());

    expect(socket.emit).toHaveBeenCalledWith('chat:join', { sessionId: 'sess_123' });
  });

  it('accumulates chat:chunk tokens into the in-flight assistant message', () => {
    const { result } = renderHook(() => useSocketChat({ widgetId: 'wid_1' }));

    act(() => result.current.sendMessage('Hello there'));
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.isStreaming).toBe(true);

    act(() => handlers['chat:chunk']({ token: 'Hi' }));
    act(() => handlers['chat:chunk']({ token: ' there' }));

    const assistantMsg = result.current.messages.at(-1);
    expect(assistantMsg.content).toBe('Hi there');
    expect(assistantMsg.streaming).toBe(true);
  });

  it('finalizes the message and persists the returned sessionId on chat:done', () => {
    const { result } = renderHook(() => useSocketChat({ widgetId: 'wid_1' }));

    act(() => result.current.sendMessage('Hello'));
    act(() =>
      handlers['chat:done']({
        sessionId: 'sess_new',
        conversationId: 'conv_1',
        messageId: 'msg_1',
        answer: 'Hi! How can I help?',
        sources: [],
        answeredFromContext: true,
        tokensUsed: { prompt: 1, completion: 1, total: 2 },
        responseTimeMs: 120,
      })
    );

    expect(storage.setSessionId).toHaveBeenCalledWith('wid_1', 'sess_new');
    expect(result.current.isStreaming).toBe(false);

    const assistantMsg = result.current.messages.at(-1);
    expect(assistantMsg.content).toBe('Hi! How can I help?');
    expect(assistantMsg.id).toBe('msg_1');
    expect(assistantMsg.streaming).toBeUndefined();
  });

  it('surfaces chat:error and drops the in-flight streaming message', () => {
    const { result } = renderHook(() => useSocketChat({ widgetId: 'wid_1' }));

    act(() => result.current.sendMessage('Hello'));
    act(() => handlers['chat:error']({ message: 'Monthly chat limit reached.' }));

    expect(result.current.error).toBe('Monthly chat limit reached.');
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.messages.find((m) => m.streaming)).toBeUndefined();
  });
});
