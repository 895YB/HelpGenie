# Deployment

## Local development

```bash
npm install                # installs all three workspaces
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp widget/.env.example widget/.env
# fill in backend/.env: MONGODB_URI (Atlas, with Vector Search enabled), OPENAI_API_KEY, JWT secrets

npm run dev                 # backend on :5000, frontend on :5173 (concurrently)
```

The widget isn't part of `npm run dev` — it's a build-time artifact, not a dev server you browse directly. To exercise it locally: `npm run build --workspace=widget`, which drops `widget.js` into `frontend/public/`, then load it from a plain HTML page via `<script src="http://localhost:5173/widget.js" data-widget-id="...">` while `npm run dev` is running.

## Docker Compose

```bash
npm run build --workspace=widget   # widget.js must exist in frontend/public BEFORE the image is built —
                                    # frontend/Dockerfile's build context is frontend/ only, so nothing
                                    # inside the container ever runs the widget's own build step
docker compose up --build
# Backend:  http://localhost:5000
# Frontend: http://localhost:3000
```

`docker-compose.staging.yml` overlays staging env vars — `docker compose -f docker-compose.yml -f docker-compose.staging.yml up`. MongoDB is Atlas-hosted in every environment; there is no local Mongo container.

## CI/CD (GitHub Actions)

- **`.github/workflows/ci.yml`** — on every push/PR to `main`/`develop`/`staging`: lints, tests, and builds each workspace independently (`backend-ci`, `frontend-ci`, `widget-ci`).
- **`.github/workflows/deploy.yml`** — triggered by `workflow_run` once the `CI` workflow *completes successfully* on `main` (or manually via `workflow_dispatch`, which bypasses the CI gate). Two jobs:
  - `deploy-backend` — POSTs to the Render API to trigger a redeploy of the existing service.
  - `deploy-frontend` — installs workspace deps, **builds the widget first** (same ordering requirement as Docker Compose above — see the comment in the workflow), then deploys `frontend/` to Vercel via the CLI (`vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod`).

## Render (backend)

`render.yaml` at the repo root is a [Render Blueprint](https://render.com/docs/blueprint-spec) — connect the repo in the Render dashboard as a Blueprint (or `render blueprint launch`) and it provisions the backend web service from `backend/Dockerfile`, wired to `GET /api/health` for its health check. Secrets (`sync: false` entries — `MONGODB_URI`, `OPENAI_API_KEY`, `CLIENT_URL`, `EMAIL_*`, `WIDGET_ALLOWED_ORIGINS`) must be filled in via the Render dashboard, never committed. `JWT_SECRET`/`JWT_REFRESH_SECRET` use `generateValue: true` so Render mints them itself.

`RENDER_BACKEND_SERVICE_ID` and `RENDER_API_KEY` must be set as GitHub Actions secrets for the `deploy-backend` job to trigger redeploys.

## Vercel (frontend)

`frontend/vercel.json` pins the framework (`vite`), build command, output directory, and an SPA rewrite (`/* → /index.html`) for React Router. Required GitHub Actions secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## Environment variables

### `backend/.env`

| Variable | Purpose |
|---|---|
| `NODE_ENV`, `PORT` | Runtime mode, listen port |
| `CLIENT_URL` | Frontend origin — used for CORS, email links, and the embed snippet's `widget.js` URL |
| `MONGODB_URI` | Atlas connection string (Vector Search enabled) |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` | Auth token signing |
| `OPENAI_API_KEY`, `OPENAI_EMBEDDING_MODEL`, `OPENAI_CHAT_MODEL` | LLM/embeddings |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` | SMTP (Nodemailer) for verification/reset/transcript emails |
| `MAX_FILE_SIZE_MB`, `UPLOAD_DIR` | Document upload limits |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | Global API rate limiting |
| `VECTOR_SEARCH_INDEX`, `VECTOR_SEARCH_NUM_CANDIDATES`, `VECTOR_SEARCH_LIMIT`, `SIMILARITY_THRESHOLD` | RAG retrieval tuning |
| `WIDGET_ALLOWED_ORIGINS` | Comma-separated CORS allow-list for the public widget/chat endpoints and Socket.io |

### `frontend/.env`

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base URL |
| `VITE_SOCKET_URL` | Backend Socket.io origin |
| `VITE_APP_NAME`, `VITE_APP_VERSION` | Branding shown in the dashboard UI |

### `widget/.env`

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base URL the widget calls (`/company/widget-config`, `/chat/*`) |
| `VITE_SOCKET_URL` | Backend Socket.io origin the widget connects to for streaming chat |

Both default to `http://localhost:5000`/`http://localhost:5000/api` when unset, so a local `npm run build --workspace=widget` works without a `.env` file.
