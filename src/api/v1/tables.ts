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
