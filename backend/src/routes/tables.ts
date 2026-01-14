import express from 'express';
import pool from '../db/connection';

const router = express.Router();

// GET /api/tables - List all tables
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, restaurant_id, table_number, seats, status, current_bill_id, created_at
      FROM tables
      ORDER BY table_number
    `);
    
    res.json({ tables: result.rows });
  } catch (error: any) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tables/:id - Get specific table
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM tables WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    res.json({ table: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching table:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tables - Create new table
router.post('/', async (req, res) => {
  try {
    const { tableNumber, seats } = req.body;
    
    if (!tableNumber) {
      return res.status(400).json({ error: 'tableNumber is required' });
    }
    
    // Get first restaurant
    const restaurantResult = await pool.query('SELECT id FROM restaurants LIMIT 1');
    if (restaurantResult.rows.length === 0) {
      return res.status(400).json({ error: 'No restaurant found' });
    }
    
    const restaurantId = restaurantResult.rows[0].id;
    
    const result = await pool.query(
      `INSERT INTO tables (restaurant_id, table_number, seats, status)
       VALUES ($1, $2, $3, 'available')
       RETURNING *`,
      [restaurantId, tableNumber, seats || 4]
    );
    
    res.status(201).json({ table: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tables/:id - Update table
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tableNumber, seats, status } = req.body;
    
    const result = await pool.query(
      `UPDATE tables 
       SET table_number = COALESCE($1, table_number),
           seats = COALESCE($2, seats),
           status = COALESCE($3, status)
       WHERE id = $4
       RETURNING *`,
      [tableNumber, seats, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    res.json({ table: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tables/:id - Delete table
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if table has active bill
    const tableResult = await pool.query(
      'SELECT current_bill_id FROM tables WHERE id = $1',
      [id]
    );
    
    if (tableResult.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    if (tableResult.rows[0].current_bill_id) {
      return res.status(400).json({ error: 'Cannot delete table with active bill' });
    }
    
    await pool.query('DELETE FROM tables WHERE id = $1', [id]);
    
    res.json({ message: 'Table deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tables/:id/bill - Get current bill for a table
router.get('/:id/bill', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tableResult = await pool.query(
      'SELECT * FROM tables WHERE id = $1',
      [id]
    );
    
    if (tableResult.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    const table = tableResult.rows[0];
    
    if (!table.current_bill_id) {
      return res.json({ bill: null });
    }
    
    const billResult = await pool.query(
      'SELECT * FROM bills WHERE id = $1',
      [table.current_bill_id]
    );
    
    if (billResult.rows.length === 0) {
      return res.json({ bill: null });
    }
    
    const bill = billResult.rows[0];
    
    const itemsResult = await pool.query(
      'SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY created_at',
      [bill.id]
    );
    
    bill.items = itemsResult.rows;
    
    res.json({ bill });
  } catch (error: any) {
    console.error('Error fetching table bill:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
