# AI Customer Support Widget

> **Multi-tenant SaaS platform** — Companies upload their documents; customers get instant AI-powered answers through an embeddable chat widget powered by RAG (Retrieval-Augmented Generation).

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT SIDE                        │
│  Admin Dashboard (React 19 + Vite)                      │
│  Embeddable Widget  (standalone widget.js IIFE)         │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / WebSocket
┌────────────────────────▼────────────────────────────────┐
│                     BACKEND API                         │
│  Express.js  ·  Socket.io  ·  JWT Auth  ·  RBAC        │
│  RAG Pipeline  ·  Document Ingestion  ·  Analytics      │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
    ┌──────▼──────┐           ┌───────▼────────┐
    │  MongoDB    │           │   OpenAI API   │
    │  Atlas      │           │  GPT-4.1       │
    │  + Vector   │           │  Embeddings    │
    │  Search     │           └────────────────┘
    └─────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Framer Motion |
| State | TanStack Query, React Hook Form |
| Backend | Node.js, Express.js, Socket.io |
| Auth | JWT + Refresh Tokens, bcrypt, RBAC |
| Database | MongoDB Atlas + Vector Search |
| AI | OpenAI GPT-4.1, text-embedding-3-small |
| Documents | pdf-parse, mammoth, cheerio |
| DevOps | Docker, GitHub Actions, Render, Vercel |

## Quick Start

### Prerequisites
- Node.js ≥ 20
- MongoDB Atlas cluster with Vector Search enabled
- OpenAI API key

### 1. Clone & install

```bash
git clone https://github.com/yourorg/ai-widget.git
cd ai-widget
npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Fill in your MongoDB URI, OpenAI key, JWT secrets, etc.
```

### 3. Run locally

```bash
npm run dev        # starts both backend (5000) and frontend (5173)
```

### 4. Run with Docker

```bash
docker compose up --build
# Backend: http://localhost:5000
# Frontend: http://localhost:3000
```

## Project Structure

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full folder breakdown.

## API Documentation

See [API.md](docs/API.md) for all endpoints.

## Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for Render + Vercel deployment guide.

## Embedding the Widget

```html
<!-- Add before closing </body> tag -->
<script
  src="https://cdn.yourapp.com/widget.js"
  data-widget-id="YOUR_WIDGET_ID"
  data-theme="light"
></script>
```

## License

MIT
