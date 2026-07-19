import axios from 'axios';

// ── Module-level token store ──────────────────────────────────
let _accessToken = null;

export function setAccessToken(token) {
  _accessToken = token;
}

export function getAccessToken() {
  return _accessToken;
}

// Callbacks registered by AuthContext so it can react to token events
let _onTokenRefreshed = null;
let _onSessionExpired = null;

export function onTokenRefreshed(cb) { _onTokenRefreshed = cb; }
export function onSessionExpired(cb) { _onSessionExpired = cb; }

// ── Axios instance ────────────────────────────────────────────
const api = axios.create({
  baseURL: '/api',
  timeout: 30_000,
  withCredentials: true, // include httpOnly refresh-token cookie
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: inject Bearer token ──────────────────
api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// ── Refresh-token queue ───────────────────────────────────────
// Prevents multiple simultaneous refresh calls. All 401s during
// an in-flight refresh are queued and replayed with the new token.
let _isRefreshing = false;
let _queue = [];

function processQueue(newToken, error) {
  _queue.forEach((p) => (error ? p.reject(error) : p.resolve(newToken)));
  _queue = [];
}

// ── Response interceptor: handle 401 with token refresh ───────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(normalizeError(error));
    }

    if (_isRefreshing) {
      // Queue this request and wait for the in-flight refresh
      return new Promise((resolve, reject) => {
        _queue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        })
        .catch(Promise.reject.bind(Promise));
    }

    original._retry = true;
    _isRefreshing = true;

    try {
      const { data } = await axios.post(
        '/api/auth/refresh',
        {},
        { withCredentials: true }
      );

      const newToken = data.data?.accessToken;
      setAccessToken(newToken);
      _onTokenRefreshed?.(newToken);
      processQueue(newToken, null);

      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshError) {
      processQueue(null, refreshError);
      setAccessToken(null);
      _onSessionExpired?.();
      return Promise.reject(normalizeError(refreshError));
    } finally {
      _isRefreshing = false;
    }
  }
);

// ── Error normalization ───────────────────────────────────────
function normalizeError(error) {
  if (error.response) {
    const err = new Error(
      error.response.data?.message || error.message || 'Request failed'
    );
    err.status = error.response.status;
    err.data = error.response.data;
    return err;
  }
  if (error.request) {
    const err = new Error('Network error — please check your connection');
    err.status = 0;
    return err;
  }
  return error;
}

export default api;
