# API Reference

Base URL: `{API_BASE_URL}/api` (local dev: `http://localhost:5000/api`).

All responses use a consistent envelope (`backend/src/utils/apiResponse.js`):

```jsonc
// success
{ "success": true, "message": "...", "data": { ... } }
// paginated
{ "success": true, "message": "...", "data": [...], "pagination": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 } }
// error
{ "success": false, "message": "...", "errors": [{ "field": "email", "message": "..." }] }
```

**Auth** column key: `Public` (no token), `JWT` (`Authorization: Bearer <token>` via `authenticate`), `JWT+Tenant` (`authenticate` + `requireTenant`, scoped to the caller's company), `Widget` (public, resolved via `widgetId` instead of a token — see [ARCHITECTURE.md](ARCHITECTURE.md#multi-tenancy-model)).

---

## `/api/auth`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/register` | Public | `{ name, email, password, companyName }` — creates a User + Company, returns tokens |
| POST | `/login` | Public | `{ email, password }` |
| POST | `/refresh` | Public | Reads the httpOnly refresh cookie, issues a new access token |
| POST | `/forgot-password` | Public | `{ email }` — always 200 regardless of whether the email exists |
| POST | `/reset-password/:token` | Public | `{ password }` |
| GET | `/verify-email/:token` | Public | |
| GET | `/me` | JWT | Current user profile |
| POST | `/logout` | JWT | Revokes the current refresh token |
| POST | `/logout-all` | JWT | Revokes every refresh token for the user |
| PUT | `/change-password` | JWT | `{ currentPassword, newPassword }` |

## `/api/company`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/widget-config` | **Widget** (query `?widgetId=`) | Public branding payload the embeddable widget renders from — `companyName`, `botName`, `welcomeMessage`, `primaryColor`, `secondaryColor`, `logo`, `avatar`, `position`, `theme`, `suggestedQuestions`, feature flags |
| GET | `/` | JWT+Tenant | |
| PUT | `/` | JWT+Tenant (admin) | |
| POST | `/logo` | JWT+Tenant (admin) | multipart upload |
| GET | `/api-key` | JWT+Tenant (admin) | Returns the sensitive `apiKey` |
| POST | `/api-key/regenerate` | JWT+Tenant (admin) | |
| GET | `/embed-code` | JWT+Tenant | Returns the `<script>` snippet pointing at `{CLIENT_URL}/widget.js` |
| GET | `/subscription` | JWT+Tenant (admin) | |

## `/api/settings`

Aggregate read/write for company + theme + widget config (all JWT+Tenant).

| Method | Path | Role |
|---|---|---|
| GET / PUT | `/` | admin-or-employee / admin |
| GET / PUT | `/theme` | admin-or-employee / admin |
| GET / PUT | `/widget` | admin-or-employee / admin |

## `/api/team` (user + team management)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/profile` | JWT | No tenant required — a user may not have a company yet |
| PUT | `/profile` | JWT | |
| POST | `/avatar` | JWT | multipart upload |
| GET | `/` | JWT+Tenant | List team members |
| POST | `/invite` | JWT+Tenant (admin) | `{ email, role }` |
| PUT | `/:userId` | JWT+Tenant (admin) | |
| DELETE | `/:userId` | JWT+Tenant (admin) | |

## `/api/documents`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/stats` | JWT+Tenant | Knowledge-base overview counts |
| GET | `/` | JWT+Tenant | Paginated list |
| POST | `/upload` | JWT+Tenant (admin) | multipart file upload → async ingestion pipeline |
| POST | `/url` | JWT+Tenant (admin) | `{ url }` → scrape + async ingestion |
| GET | `/:id` | JWT+Tenant | |
| DELETE | `/:id` | JWT+Tenant (admin) | |
| POST | `/:id/retry` | JWT+Tenant (admin) | Re-runs ingestion after a failure |
| GET | `/:id/chunks` | JWT+Tenant | Inspect the chunks a document produced |

## `/api/chat`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | **Widget** | `{ widgetId, question, sessionId?, customerEmail?, customerName? }` — non-streaming REST fallback for `sendMessage` |
| POST | `/feedback/:messageId` | **Widget** | `{ sessionId, rating: 'thumbs_up'|'thumbs_down', comment? }` |
| POST | `/transcript` | **Widget** | `{ sessionId, email }` — emails the full transcript |
| GET | `/history` | **Widget** (query `?widgetId=&sessionId=`) | Restores prior turns for a `sessionId` after a page refresh; returns `{ conversationId, messages: [] }` if the session is unknown |
| GET | `/conversations` | JWT+Tenant | Paginated conversation list (`?page&limit&status`) |
| GET | `/conversations/:id` | JWT+Tenant | Conversation + full message thread |
| DELETE | `/conversations/:id` | JWT+Tenant | Soft-closes a conversation |

### Socket.io (same public/widget trust boundary as the REST chat routes)

| Direction | Event | Payload |
|---|---|---|
| Client → Server | `chat:join` | `{ sessionId }` — joins `session:${sessionId}` room (multi-tab) |
| Client → Server | `chat:message` | `{ widgetId, question, sessionId?, customerEmail?, customerName? }` |
| Client → Server | `chat:typing` | `{ sessionId, isTyping }` |
| Server → Client | `chat:chunk` | `{ token, sessionId }` — one per streamed answer token |
| Server → Client | `chat:done` | `{ sessionId, conversationId, messageId, answer, sources, answeredFromContext, tokensUsed, responseTimeMs }` |
| Server → Client | `chat:error` | `{ message }` |

`sources` items: `{ chunkId, documentId, documentName, excerpt, score, page?, url? }`. Rate limits: REST `chatLimiter` is 60 req/min/IP; sockets use a separate 60 msg/min/socket in-memory limiter.

## `/api/analytics`

All JWT+Tenant, admin-or-employee. Shared `?from&to` (ISO 8601) date-range query on most routes.

| Method | Path |
|---|---|
| GET | `/overview` |
| GET | `/chats/daily` |
| GET | `/chats/hourly` |
| GET | `/satisfaction` |
| GET | `/tokens` |
| GET | `/documents` |
| GET | `/feedback` |
| GET | `/export` (CSV) |

## Health check

`GET /api/health` → `{ status: 'ok', timestamp }`. Used by the Docker/Render health checks. Subject to the same global rate limiter as the rest of `/api`.
