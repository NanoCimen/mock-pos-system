import express from 'express';
import pool from '../db/connection';

const router = express.Router();

// GET /api/bills - Get all bills
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM bills
      ORDER BY created_at DESC
      LIMIT 50
    `);
    
    res.json({ bills: result.rows });
  } catch (error: any) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/bills/:id - Get bill by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const billResult = await pool.query(
      'SELECT * FROM bills WHERE id = $1',
      [id]
    );
    
    if (billResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    const bill = billResult.rows[0];
    
    const itemsResult = await pool.query(
      'SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY created_at',
      [id]
    );
    
    bill.items = itemsResult.rows;
    
    res.json({ bill });
  } catch (error: any) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bills - Create new bill
router.post('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { tableId, tableNumber } = req.body;
    
    if (!tableId || !tableNumber) {
      return res.status(400).json({ error: 'tableId and tableNumber required' });
    }
    
    await client.query('BEGIN');
    
    const tableResult = await client.query(
      'SELECT * FROM tables WHERE id = $1',
      [tableId]
    );
    
    if (tableResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Table not found' });
    }
    
    const table = tableResult.rows[0];
    
    if (table.current_bill_id) {
      const existingBill = await client.query(
        'SELECT * FROM bills WHERE id = $1 AND status = $2',
        [table.current_bill_id, 'open']
      );
      
      if (existingBill.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Table already has an open bill' });
      }
    }
    
    const billResult = await client.query(
      `INSERT INTO bills (restaurant_id, table_id, table_number, status, subtotal, tax, total)
       VALUES ($1, $2, $3, 'open', 0, 0, 0)
       RETURNING *`,
      [table.restaurant_id, tableId, tableNumber]
    );
    
    const billId = billResult.rows[0].id;
    
    await client.query(
      `UPDATE tables SET status = 'occupied', current_bill_id = $1 WHERE id = $2`,
      [billId, tableId]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({ bill: billResult.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating bill:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// POST /api/bills/:id/items - Add items to bill
router.post('/:id/items', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'items array required' });
    }
    
    await client.query('BEGIN');
    
    const billResult = await client.query(
      'SELECT * FROM bills WHERE id = $1',
      [id]
    );
    
    if (billResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    const bill = billResult.rows[0];
    
    if (bill.status !== 'open') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot add items to closed bill' });
    }
    
    const restaurantResult = await client.query(
      'SELECT tax_rate FROM restaurants WHERE id = $1',
      [bill.restaurant_id]
    );
    const taxRate = restaurantResult.rows[0].tax_rate;
    
    let newSubtotal = parseFloat(bill.subtotal);
    
    for (const item of items) {
      const menuItem = await client.query(
        'SELECT * FROM menu_items WHERE id = $1 AND available = true',
        [item.menuItemId]
      );
      
      if (menuItem.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Menu item ${item.menuItemId} not found or unavailable` });
      }
      
      const menu = menuItem.rows[0];
      const quantity = item.quantity || 1;
      
      await client.query(
        `INSERT INTO bill_items (bill_id, menu_item_id, name, price, quantity, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, menu.id, menu.name, menu.price, quantity, item.notes]
      );
      
      newSubtotal += parseFloat(menu.price) * quantity;
    }
    
    const newTax = newSubtotal * taxRate;
    const newTotal = newSubtotal + newTax;
    
    await client.query(
      `UPDATE bills SET subtotal = $1, tax = $2, total = $3, updated_at = NOW() WHERE id = $4`,
      [newSubtotal, newTax, newTotal, id]
    );
    
    await client.query('COMMIT');
    
    const updatedBill = await pool.query(
      'SELECT * FROM bills WHERE id = $1',
      [id]
    );
    
    const itemsResult = await pool.query(
      'SELECT * FROM bill_items WHERE bill_id = $1',
      [id]
    );
    
    const response = { ...updatedBill.rows[0], items: itemsResult.rows };
    
    res.json({ bill: response });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error adding items:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// POST /api/bills/:id/mark-paid - Mark bill as paid
router.post('/:id/mark-paid', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;
    
    if (!['cash', 'card', 'external'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid paymentMethod' });
    }
    
    await client.query('BEGIN');
    
    const billResult = await client.query(
      'SELECT * FROM bills WHERE id = $1',
      [id]
    );
    
    if (billResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    const bill = billResult.rows[0];
    
    if (bill.status !== 'open') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Bill is not open' });
    }
    
    await client.query(
      `UPDATE bills SET status = 'paid', payment_method = $1, paid_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [paymentMethod, id]
    );
    
    await client.query(
      `UPDATE tables SET status = 'available', current_bill_id = NULL WHERE id = $1`,
      [bill.table_id]
    );
    
    await client.query('COMMIT');
    
    res.json({ message: 'Bill marked as paid' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error marking bill paid:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;
