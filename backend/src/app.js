import 'dotenv/config';
import { validateEnv } from './config/env.js';

// Fail fast — crash before binding if env is misconfigured
validateEnv();

import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { connectDB } from './config/database.js';
import logger from './utils/logger.js';
import { globalLimiter } from './middleware/rateLimit.middleware.js';
import errorMiddleware from './middleware/error.middleware.js';

import authRoutes     from './routes/auth.routes.js';
import companyRoutes  from './routes/company.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import userRoutes     from './routes/user.routes.js';
import documentRoutes from './routes/document.routes.js';
import chatRoutes      from './routes/chat.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import { initSocket }  from './config/socket.js';

const app = express();

// ── Security headers ─────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow widget.js delivery
  })
);

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.WIDGET_ALLOWED_ORIGINS?.split(',').map((s) => s.trim()) ?? []),
].filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Allow requests with no origin (curl, mobile apps, Postman)
      if (!origin) {return cb(null, true);}
      if (allowedOrigins.includes(origin)) {return cb(null, true);}
      cb(new Error(`CORS policy does not allow origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'],
  })
);

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ── NoSQL injection & HTTP parameter pollution prevention ────
app.use(mongoSanitize());
app.use(hpp());

// ── HTTP request logging ─────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    })
  );
}

// ── Static file serving for uploaded logos and avatars ───────
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'), {
    maxAge: '7d',         // browser caches images for 7 days
    etag: true,
    dotfiles: 'deny',     // never serve hidden files from uploads dir
  })
);

// ── Global rate limit ─────────────────────────────────────────
app.use('/api', globalLimiter);

// ── Health check (before auth so load balancers can reach it) ─
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/company',   companyRoutes);
app.use('/api/settings',  settingsRoutes);
app.use('/api/team',      userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat',      chatRoutes);
app.use('/api/analytics', analyticsRoutes);

// ── 404 handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler (must be last) ──────────────────────
app.use(errorMiddleware);

// ── Server bootstrap ──────────────────────────────────────────
const httpServer = createServer(app);

// Attach Socket.io to the http server
initSocket(httpServer);

async function start() {
  await connectDB();

  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
}

// Only start the server when this file is run directly.
// When imported by tests, they manage their own lifecycle.
if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app, httpServer };
