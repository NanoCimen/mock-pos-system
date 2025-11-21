import express from 'express';
import pool from '../db/connection';

const router = express.Router();

// GET /api/menu - Get all menu items
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM menu_items
      ORDER BY category, name
    `);
    
    res.json({ items: result.rows });
  } catch (error: any) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/menu/:id - Get specific menu item
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM menu_items WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json({ item: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/menu - Create menu item
router.post('/', async (req, res) => {
  try {
    const { name, category, price, description, available } = req.body;
    
    if (!name || !category || price === undefined) {
      return res.status(400).json({ error: 'name, category, and price are required' });
    }
    
    const validCategories = ['appetizer', 'main', 'dessert', 'beverage', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${validCategories.join(', ')}` });
    }
    
    // Get first restaurant
    const restaurantResult = await pool.query('SELECT id FROM restaurants LIMIT 1');
    if (restaurantResult.rows.length === 0) {
      return res.status(400).json({ error: 'No restaurant found' });
    }
    
    const restaurantId = restaurantResult.rows[0].id;
    
    const result = await pool.query(
      `INSERT INTO menu_items (restaurant_id, name, category, price, description, available)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [restaurantId, name, category, price, description, available !== false]
    );
    
    res.status(201).json({ item: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/menu/:id - Update menu item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, description, available } = req.body;
    
    const result = await pool.query(
      `UPDATE menu_items 
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           price = COALESCE($3, price),
           description = COALESCE($4, description),
           available = COALESCE($5, available)
       WHERE id = $6
       RETURNING *`,
      [name, category, price, description, available, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json({ item: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/menu/:id - Delete menu item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM menu_items WHERE id = $1', [id]);
    
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
