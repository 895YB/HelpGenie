// Persists the widget's sessionId per-company so a page refresh (or a new
// tab) reuses the same Conversation instead of starting a fresh one.
const PREFIX = 'aiw_session_';

export const storage = {
  getSessionId(widgetId) {
    try {
      return window.localStorage.getItem(PREFIX + widgetId);
    } catch {
      return null; // localStorage unavailable (private browsing, disabled cookies, etc.)
    }
  },

  setSessionId(widgetId, sessionId) {
    try {
      window.localStorage.setItem(PREFIX + widgetId, sessionId);
    } catch {
      // best-effort — the chat still works within the tab, it just won't survive a refresh
    }
  },
};
