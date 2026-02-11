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

export default router;
