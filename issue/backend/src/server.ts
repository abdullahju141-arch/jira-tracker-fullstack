// src/server.ts
import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { connectDB } from './config/db';
import { initWSServer } from './sockets/wsServer';
import { notFound, errorHandler } from './middleware/error';
import apiRoutes from './routes/index';

// ── App ────────────────────────────────────────────────────────────────────────
const app        = express();
const httpServer = http.createServer(app);

// ── Database ───────────────────────────────────────────────────────────────────
connectDB();

// ── WebSocket server ───────────────────────────────────────────────────────────
initWSServer(httpServer);

// ── Security middleware ────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // relax for API-only server
  })
);

app.use(
  cors({
    origin:      process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Version'],
  })
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max:      Number(process.env.RATE_LIMIT_MAX)        || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Tighter limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

app.use('/api/', limiter);
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logging ───────────────────────────────────────────────────────────
app.use(
  morgan(
    process.env.NODE_ENV === 'production'
      ? 'combined'
      : ':method :url :status :response-time ms'
  )
);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success:     true,
    status:      'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp:   new Date().toISOString(),
    uptime:      process.uptime(),
  });
});

// ── API routes ─────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── 404 + error handling ───────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start server ───────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;

httpServer.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║      Jira Tracker — Backend API + WebSocket      ║
  ╠══════════════════════════════════════════════════╣
  ║  🚀  HTTP  : http://localhost:${PORT}              ║
  ║  📡  WS    : ws://localhost:${PORT}/ws             ║
  ║  🌍  Env   : ${(process.env.NODE_ENV || 'development').padEnd(22)}  ║
  ║  🏥  Health: http://localhost:${PORT}/health       ║
  ╚══════════════════════════════════════════════════╝
  `);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully…');
  httpServer.close(() => {
    console.log('HTTP + WS server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
  httpServer.close(() => process.exit(1));
});

export { app, httpServer };
