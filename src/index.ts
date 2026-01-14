import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import v1Router from './api/v1/index';
import { apiKeyAuth } from './middleware/auth';

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoints (no auth required) - must be before API routes
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API v1 routes (with auth) - mounted after health checks
app.use('/api/v1', apiKeyAuth, v1Router);

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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 POS Simulator running on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api/v1`);
  console.log(`🔑 API Key: ${process.env.POS_API_KEY || 'dev-api-key-12345'}`);
  console.log(`⚡ Simulated delay: ${process.env.SIMULATED_DELAY_MS || 0}ms`);
  console.log(`💥 Failure rate: ${parseFloat(process.env.FAILURE_RATE || '0') * 100}%`);
});
