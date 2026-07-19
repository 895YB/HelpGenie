# HelpGenie — AI Customer Support Widget

> **Multi-tenant SaaS platform** — companies upload their documents; their customers get instant, grounded AI answers through an embeddable chat widget powered by RAG (Retrieval-Augmented Generation).

<!--
  Demo video: add the link here once recorded.
  [![Watch the demo](docs/images/demo-thumbnail.png)](https://your-demo-video-link)
-->

---

## Overview

HelpGenie lets a company drop a single `<script>` tag onto their website and get a fully working AI support agent, trained on their own documents (PDF, DOCX, TXT, or a public URL) — no ML expertise required. Every company gets its own isolated tenant: their own document store, chat history, branding, team, and usage limits, all enforced at the database and API layer.

## Features

- **Document ingestion** — upload PDFs/DOCX/TXT or paste a URL; the pipeline extracts text, chunks it, embeds it (OpenAI `text-embedding-3-small`), and stores it in MongoDB Atlas Vector Search, all in the background.
- **RAG-grounded chat** — every answer is generated from the company's own documents via a vector-search-retrieved context window, with an anti-prompt-injection system prompt and a graceful fallback when nothing relevant is found. Cited sources are returned alongside every answer.
- **Real-time streaming** — answers stream token-by-token over Socket.io (with a non-streaming REST fallback for clients that can't use WebSockets).
- **Embeddable widget** — a standalone, dependency-light IIFE bundle that mounts inside a Shadow DOM (so its styles never leak into or collide with the host page), fully themeable per company (colors, bot name, greeting, logo/avatar, position), with chat history that survives a page refresh.
- **Multi-tenant core** — company/team/RBAC (admin, employee), tenant-scoped data isolation on every query, per-company API keys and public widget IDs.
- **Auth** — JWT + refresh tokens, email verification, password reset, rate-limited login/registration.
- **Analytics dashboard** — daily/hourly chat volume, satisfaction trend, token usage & estimated cost, document usage, CSV export.
- **Conversation history** — full transcript viewer for the support team, with thumbs up/down feedback and email-transcript-to-customer.
- **Subscription tiers** — plan-based chat/document limits enforced server-side.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT SIDE                        │
│  Admin Dashboard (React 19 + Vite)                       │
│  Embeddable Widget  (standalone widget.js, Shadow DOM)   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / WebSocket
┌────────────────────────▼────────────────────────────────┐
│                     BACKEND API                          │
│  Express.js  ·  Socket.io  ·  JWT Auth  ·  RBAC          │
│  RAG Pipeline  ·  Document Ingestion  ·  Analytics        │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
    ┌──────▼──────┐           ┌───────▼────────┐
    │  MongoDB    │           │   OpenAI API   │
    │  Atlas      │           │  GPT-4.1       │
    │  + Vector   │           │  Embeddings    │
    │  Search     │           └────────────────┘
    └─────────────┘
```

Full system diagram, data flow, and multi-tenancy model: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Screenshots

<!-- Add screenshots here once captured, e.g.: -->
<!-- ![Dashboard overview](docs/images/dashboard-overview.png) -->
<!-- ![Chat widget](docs/images/widget-chat.png) -->
<!-- ![Analytics](docs/images/analytics.png) -->

*(Screenshots coming soon.)*

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Framer Motion, TanStack Query |
| Widget | React 19, Vite (IIFE build), Shadow DOM, Socket.io client |
| Backend | Node.js, Express.js, Socket.io |
| Auth | JWT + Refresh Tokens, bcrypt, RBAC |
| Database | MongoDB Atlas + Vector Search |
| AI | OpenAI GPT-4.1, text-embedding-3-small |
| Documents | pdf-parse, mammoth, cheerio |
| Testing | Jest + Supertest (backend), Vitest + Testing Library (frontend, widget) |
| DevOps | Docker, GitHub Actions, Render, Vercel |

## Project Structure

```
backend/    Express API — auth, multi-tenancy, RAG, chat, analytics
frontend/   React admin dashboard (also serves widget.js as a static asset)
widget/     Embeddable chat widget — builds into frontend/public/widget.js
docs/       Architecture, API reference, deployment guide
```

Full breakdown: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Quick Start

### Prerequisites
- Node.js ≥ 20
- MongoDB Atlas cluster with Vector Search enabled
- OpenAI API key

### 1. Clone & install

```bash
git clone https://github.com/895YB/HelpGenie.git
cd HelpGenie
npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp widget/.env.example widget/.env
# Fill in backend/.env: MONGODB_URI, OPENAI_API_KEY, JWT_SECRET, JWT_REFRESH_SECRET, etc.
```

### 3. Run locally

```bash
npm run dev        # starts both backend (5000) and frontend (5173)
```

### 4. Run with Docker

```bash
npm run build --workspace=widget   # widget.js must exist before the image is built
docker compose up --build
# Backend: http://localhost:5000
# Frontend: http://localhost:3000
```

### 5. Run the tests

```bash
npm test            # backend + frontend + widget, 240 tests
npm run lint         # all three workspaces
```

## API Documentation

Full endpoint reference (REST + Socket.io events): **[docs/API.md](docs/API.md)**.

## Deployment

Render (backend) + Vercel (frontend) + MongoDB Atlas, with GitHub Actions CI/CD gating deploys on passing tests. Full guide including all required environment variables: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## Embedding the Widget

```html
<!-- Add before closing </body> tag -->
<script
  src="https://your-frontend-domain.com/widget.js"
  data-widget-id="YOUR_WIDGET_ID"
  data-theme="light"
  async
></script>
```

`YOUR_WIDGET_ID` is generated per company and available from the dashboard's Settings → Embed tab, along with this exact snippet pre-filled.

## Demo

*(Video link coming soon.)*

## License

MIT
