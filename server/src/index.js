import './config/env.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import vaultRoutes from './routes/vaultRoutes.js';
import { getSupabaseStatus } from './config/supabase.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Allowed origins configuration supporting web app, local dev, and Chrome extensions
const allowedOrigins = [
  'https://auto-dox.vercel.app',
  process.env.APP_URL,
  process.env.CORS_ORIGIN,
  'https://autodox-backend.onrender.com',
  'http://localhost:5173',
  'http://localhost:5001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5001'
]
  .filter(Boolean)
  .map((origin) => origin.trim().replace(/\/+$/, ''));

// CORS configuration supporting web app, local dev, and Chrome extensions
const corsOptions = {
  origin: (origin, callback) => {
    // 1. Allow requests with no origin (mobile apps, curl, extension background, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // 2. Allow Chrome extension contexts
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }

    // 3. Allow explicitly configured origins, Vercel deployments, and local development hosts
    const cleanOrigin = origin.trim().replace(/\/+$/, '');
    const isApproved = allowedOrigins.includes(cleanOrigin);
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);
    const isVercel = /^https:\/\/[a-zA-Z0-9_.-]+\.vercel\.app$/.test(cleanOrigin);

    if (isApproved || isLocalhost || isVercel || process.env.NODE_ENV === 'test') {
      return callback(null, true);
    }

    // Reject unapproved cross-origin requests
    return callback(new Error(`CORS blocked: Origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// Request logger for development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[AutoDox API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AutoDox AI Shared Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: `${Math.round(process.uptime())}s`,
    database: getSupabaseStatus()
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Personal Information Vault routes
app.use('/api/vault', vaultRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `API endpoint not found: ${req.method} ${req.path}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (err && err.message && err.message.startsWith('CORS blocked:')) {
    return res.status(403).json({
      status: 'error',
      message: err.message
    });
  }
  console.error('[AutoDox API] Unhandled server error:', err);
  res.status(500).json({
    status: 'error',
    message: 'An unexpected internal server error occurred.'
  });
});

import { fileURLToPath } from 'url';

// Only start listener if executed directly (e.g. `node src/index.js`)
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 AutoDox AI Shared Backend running at http://localhost:${PORT}`);
    console.log(`🔒 Authentication: Supabase Auth (Native) + Zod active`);
    const dbStatus = getSupabaseStatus();
    if (dbStatus.isConfigured) {
      console.log(`🗄️  Database: Supabase PostgreSQL connected`);
    } else {
      console.log(`🗄️  Database: Supabase pending credentials in server/.env`);
    }
    console.log(`======================================================\n`);
  });
}

export default app;
