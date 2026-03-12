import { Router, Request, Response } from 'express';
import pool from '../../db/connection';
import { shouldSimulateFailure, simulateDelay } from '../../utils/helpers';

export interface PosTable {
  id: string;
  mesa_id: string;
  label: string;
  seats: number;
  created_at: Date;
}

const router = Router();

// GET /api/v1/tables - List all tables
router.get('/', async (req: Request, res: Response) => {
  try {
    await simulateDelay();
    if (shouldSimulateFailure()) {
      return res.status(500).json({ success: false, error: 'Simulated server error' });
    }
    const result = await pool.query(
      `SELECT id, mesa_id, label, seats, created_at FROM tables ORDER BY label`
    );
    return res.json({
      success: true,
      data: result.rows as PosTable[],
    });
  } catch (error: any) {
    console.error('Error fetching tables:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/tables - Create table
router.post('/', async (req: Request, res: Response) => {
  try {
    await simulateDelay();
    if (shouldSimulateFailure()) {
      return res.status(500).json({ success: false, error: 'Simulated server error' });
    }
    const body = req.body as { mesa_id?: string; mesaId?: string; label?: string; seats?: number };
    const mesa_id = body.mesa_id ?? body.mesaId ?? '';
    const label = body.label ?? mesa_id ?? 'Table';
    const seats = typeof body.seats === 'number' ? body.seats : parseInt(String(body.seats || 4), 10) || 4;

    if (!mesa_id.trim()) {
      return res.status(400).json({
        success: false,
        error: 'mesa_id is required',
      });
    }

    const result = await pool.query(
      `INSERT INTO tables (mesa_id, label, seats) VALUES ($1, $2, $3)
       RETURNING id, mesa_id, label, seats, created_at`,
      [mesa_id.trim(), label.trim(), seats]
    );
    const row = result.rows[0];
    return res.status(201).json({
      success: true,
      data: row as PosTable,
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: 'Table with this mesa_id already exists' });
    }
    console.error('Error creating table:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export interface MesaCloseLog {
  id: string;
  mesa_id: string;
  ticket_id: string;
  total_amount: number;
  currency: string;
  items_summary: { name: string; price: number; quantity: number }[];
  closed_at: Date;
}

// POST /api/v1/tables/close-mesa - Close mesa (log ticket + set CLOSED so mesa can restart)
router.post('/close-mesa', async (req: Request, res: Response) => {
  try {
    await simulateDelay();
    if (shouldSimulateFailure()) {
      return res.status(500).json({ success: false, error: 'Simulated server error' });
    }
    const body = req.body as { mesa_id?: string; mesaId?: string };
    const mesa_id = (body.mesa_id ?? body.mesaId ?? '').trim();
    if (!mesa_id) {
      return res.status(400).json({ success: false, error: 'mesa_id is required' });
    }
    const tickets = await pool.query(
      `SELECT id, total_amount, currency FROM tickets WHERE mesa_id = $1 AND status IN ('OPEN', 'PARTIALLY_PAID', 'PAID') ORDER BY created_at DESC LIMIT 1`,
      [mesa_id]
    );
    if (tickets.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No active ticket to close for this mesa' });
    }
    const ticket = tickets.rows[0];
    const items = await pool.query(
      `SELECT name, price, quantity FROM ticket_items WHERE ticket_id = $1 ORDER BY created_at`,
      [ticket.id]
    );
    const items_summary = items.rows.map((r: any) => ({ name: r.name, price: r.price, quantity: r.quantity }));
    const logResult = await pool.query(
      `INSERT INTO mesa_close_logs (mesa_id, ticket_id, total_amount, currency, items_summary)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, mesa_id, ticket_id, total_amount, currency, items_summary, closed_at`,
      [mesa_id, ticket.id, ticket.total_amount, ticket.currency || 'DOP', JSON.stringify(items_summary)]
    );
    await pool.query(
      `UPDATE tickets SET status = 'CLOSED', updated_at = NOW() WHERE id = $1`,
      [ticket.id]
    );
    const row = logResult.rows[0];
    const log: MesaCloseLog = {
      id: row.id,
      mesa_id: row.mesa_id,
      ticket_id: row.ticket_id,
      total_amount: row.total_amount,
      currency: row.currency,
      items_summary: typeof row.items_summary === 'string' ? JSON.parse(row.items_summary) : row.items_summary,
      closed_at: row.closed_at,
    };
    return res.json({ success: true, data: log });
  } catch (error: any) {
    console.error('Error closing mesa:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/tables/close-logs - List recent closed mesas (for logs section)
router.get('/close-logs', async (req: Request, res: Response) => {
  try {
    await simulateDelay();
    if (shouldSimulateFailure()) {
      return res.status(500).json({ success: false, error: 'Simulated server error' });
    }
    const limit = Math.min(100, parseInt(String(req.query.limit || 50), 10) || 50);
    const result = await pool.query(
      `SELECT id, mesa_id, ticket_id, total_amount, currency, items_summary, closed_at
       FROM mesa_close_logs ORDER BY closed_at DESC LIMIT $1`,
      [limit]
    );
    const logs: MesaCloseLog[] = result.rows.map((row: any) => ({
      id: row.id,
      mesa_id: row.mesa_id,
      ticket_id: row.ticket_id,
      total_amount: row.total_amount,
      currency: row.currency,
      items_summary: typeof row.items_summary === 'string' ? JSON.parse(row.items_summary) : (row.items_summary || []),
      closed_at: row.closed_at,
    }));
    return res.json({ success: true, data: logs });
  } catch (error: any) {
    console.error('Error fetching close logs:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/tables/:id - Get one table by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    await simulateDelay();
    if (shouldSimulateFailure()) {
      return res.status(500).json({ success: false, error: 'Simulated server error' });
    }
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, mesa_id, label, seats, created_at FROM tables WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    return res.json({ success: true, data: result.rows[0] as PosTable });
  } catch (error: any) {
    console.error('Error fetching table:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/v1/tables/:id - Update table (mesa_id, label, seats)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    await simulateDelay();
    if (shouldSimulateFailure()) {
      return res.status(500).json({ success: false, error: 'Simulated server error' });
    }
    const { id } = req.params;
    const body = req.body as { mesa_id?: string; mesaId?: string; label?: string; seats?: number };
    const mesa_id = body.mesa_id ?? body.mesaId;
    const label = body.label;
    const seats = typeof body.seats === 'number' ? body.seats : body.seats != null ? parseInt(String(body.seats), 10) : undefined;

    const existing = await pool.query(
      `SELECT id, mesa_id, label, seats FROM tables WHERE id = $1`,
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    const row = existing.rows[0];
    const new_mesa_id = mesa_id !== undefined ? mesa_id.trim() : row.mesa_id;
    const new_label = label !== undefined ? label.trim() : row.label;
    const new_seats = seats !== undefined && !isNaN(seats) ? Math.max(1, seats) : row.seats;

    if (new_mesa_id === '') {
      return res.status(400).json({ success: false, error: 'mesa_id cannot be empty' });
    }

    const result = await pool.query(
      `UPDATE tables SET mesa_id = $1, label = $2, seats = $3 WHERE id = $4
       RETURNING id, mesa_id, label, seats, created_at`,
      [new_mesa_id, new_label, new_seats, id]
    );
    return res.json({ success: true, data: result.rows[0] as PosTable });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: 'Table with this mesa_id already exists' });
    }
    console.error('Error updating table:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/tables/:id - Delete table (only if no open tickets reference this mesa_id)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await simulateDelay();
    if (shouldSimulateFailure()) {
      return res.status(500).json({ success: false, error: 'Simulated server error' });
    }
    const { id } = req.params;
    const existing = await pool.query(
      `SELECT mesa_id FROM tables WHERE id = $1`,
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    const mesa_id = existing.rows[0].mesa_id;
    const openTickets = await pool.query(
      `SELECT 1 FROM tickets WHERE mesa_id = $1 AND status IN ('OPEN', 'PARTIALLY_PAID') LIMIT 1`,
      [mesa_id]
    );
    if (openTickets.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete table with open or partially paid tickets',
      });
    }
    await pool.query('DELETE FROM tables WHERE id = $1', [id]);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error deleting table:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
