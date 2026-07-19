// Thin fetch-based REST client — deliberately dependency-free (no axios)
// since this bundle ships to third-party sites and every KB counts.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, { method = 'GET', params, body } = {}) {
  const url = new URL(API_URL.replace(/\/$/, '') + path);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.message || `Request failed with status ${res.status}`);
  }
  return json?.data;
}

export const api = {
  /** @returns {Promise<import('../types').WidgetConfig>} */
  getWidgetConfig(widgetId) {
    return request('/company/widget-config', { params: { widgetId } });
  },

  /** @returns {Promise<{conversationId: string|null, messages: import('../types').ChatMessage[]}>} */
  getSessionHistory(widgetId, sessionId) {
    return request('/chat/history', { params: { widgetId, sessionId } });
  },

  /** REST fallback for sending a message without a socket connection. */
  sendMessage({ widgetId, question, sessionId, customerEmail, customerName }) {
    return request('/chat', {
      method: 'POST',
      body: { widgetId, question, sessionId, customerEmail, customerName },
    });
  },

  sendFeedback({ messageId, sessionId, rating, comment }) {
    return request(`/chat/feedback/${messageId}`, {
      method: 'POST',
      body: { sessionId, rating, comment },
    });
  },

  sendTranscript({ sessionId, email }) {
    return request('/chat/transcript', {
      method: 'POST',
      body: { sessionId, email },
    });
  },
};
