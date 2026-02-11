import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import v1Router from './api/v1/index';
import { apiKeyAuth } from './middleware/auth';
import { pool } from './db/connection';

// DEBUG: Check what PORT we're getting from environment
console.log("ENV PORT =", process.env.PORT);

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoints (no auth required) - must be before API routes
app.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// API v1 routes (with auth) - mounted after health checks
app.use('/api/v1', apiKeyAuth, v1Router);

// Serve POS UI (built static files) when present — SPA fallback via middleware (Express 5 rejects route '*')
const posUiPath = path.join(__dirname, '..', 'pos-ui', 'dist');
app.use(express.static(posUiPath));
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
  res.sendFile(path.join(posUiPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
const PORT = Number(process.env.PORT) || 3000;

// Determine API URL based on environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
const apiBaseUrl = process.env.POS_BASE_URL ||
  (isProduction ? 'https://pos.yap.net.do/api/v1' : `http://localhost:${PORT}/api/v1`);

console.log("FINAL PORT USED =", PORT);

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 POS Simulator running on port ${PORT}`);
  console.log(`📍 API: ${apiBaseUrl}`);
  if (isProduction) {
    console.log(`🌐 Cloud deployment: Railway`);
  }
  console.log(`🔑 API Key: ${process.env.POS_API_KEY || 'dev-api-key-12345'}`);
  console.log(`⚡ Simulated delay: ${process.env.SIMULATED_DELAY_MS || 0}ms`);
  console.log(`💥 Failure rate: ${parseFloat(process.env.FAILURE_RATE || '0') * 100}%`);
});

// Graceful shutdown so Railway restarts cleanly (avoids SIGTERM → npm error / stuck processes)
function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('PostgreSQL pool closed');
      process.exit(0);
    });
  });
  // Force exit after 10s if pool.end hangs
  setTimeout(() => {
    console.error('Shutdown timeout, forcing exit');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
