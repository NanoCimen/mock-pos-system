import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './db/init';
import tablesRouter from './routes/tables';
import billsRouter from './routes/bills';
import menuRouter from './routes/menu';
import restaurantRouter from './routes/restaurant';
import { validateApiKey } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// CORS - Allow all origins since API key protects endpoints
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-API-Key']
}));

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mock POS API is running' });
});

// Apply API key authentication to all /api/* routes
app.use('/api', validateApiKey);

// API Routes (protected)
app.use('/api/tables', tablesRouter);
app.use('/api/bills', billsRouter);
app.use('/api/menu', menuRouter);
app.use('/api/restaurant', restaurantRouter);

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log('');
      console.log('🚀 ============================================');
      console.log(`   Mock POS API Server`);
      console.log('   ============================================');
      console.log(`   📍 Local:    http://localhost:${PORT}`);
      console.log(`   📍 Network:  http://0.0.0.0:${PORT}`);
      console.log('');
      console.log('   🔒 Protected Routes: /api/*');
      console.log('   ✅ Health Check:     /health (public)');
      console.log('');
      console.log('   API Keys Loaded:', process.env.API_KEYS ? '✓' : '✗');
      console.log('============================================');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
