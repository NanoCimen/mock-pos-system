import { Router } from 'express';
import ticketsRouter from './tickets';
import itemsRouter from './items';
import paymentsRouter from './payments';

const router = Router();

// GET /api/v1/health - Health check (for Railway)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /api/v1/capabilities - POS capabilities (NO DATABASE - static response)
router.get('/capabilities', (_req, res) => {
  return res.json({
    success: true,
    data: {
      supportsPartialPayments: true,
      supportsItemLocking: false,
      supportsWebhooks: false,
      supportsRefunds: false,
      currency: ['DOP'],
    },
  });
});

// Mount sub-routers
router.use('/tickets', ticketsRouter);
router.use('/tickets', itemsRouter); // For /tickets/:ticketId/items
router.use('/items', itemsRouter); // For /items/:itemId
router.use('/payments', paymentsRouter);

export default router;
