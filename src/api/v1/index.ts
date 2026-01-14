import { Router } from 'express';
import ticketsRouter from './tickets.js';
import itemsRouter from './items.js';
import paymentsRouter from './payments.js';
import { PosCapabilities } from '../../types/index.js';
import pool from '../../db/connection.js';

const router = Router();

// GET /api/v1/health - Health check (for Railway)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /api/v1/capabilities - POS capabilities
router.get('/capabilities', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pos_config LIMIT 1');
    const config = result.rows[0];

    const capabilities: PosCapabilities = {
      supportsPartialPayments: true,
      supportsItemLocking: false,
      supportsWebhooks: false,
      supportsRefunds: false,
      currency: [config?.currency || 'DOP'],
    };

    return res.json({
      success: true,
      data: capabilities,
    });
  } catch (error: any) {
    console.error('Error fetching capabilities:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Mount sub-routers
router.use('/tickets', ticketsRouter);
router.use('/tickets', itemsRouter); // For /tickets/:ticketId/items
router.use('/items', itemsRouter); // For /items/:itemId
router.use('/payments', paymentsRouter);

export default router;
