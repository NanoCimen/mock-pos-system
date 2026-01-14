import express from 'express';
import pool from '../db/connection';

const router = express.Router();

// GET /api/restaurant - Get restaurant info
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM restaurants LIMIT 1');
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No restaurant found' });
    }
    
    res.json({ restaurant: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/restaurant/:id - Update restaurant settings
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, tax_rate, currency } = req.body;
    
    const result = await pool.query(
      `UPDATE restaurants 
       SET name = COALESCE($1, name),
           tax_rate = COALESCE($2, tax_rate),
           currency = COALESCE($3, currency)
       WHERE id = $4
       RETURNING *`,
      [name, tax_rate, currency, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    res.json({ restaurant: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

