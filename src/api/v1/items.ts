import { Router } from 'express';
import pool from '../../db/connection';
import { TicketItem, AddItemsRequest, UpdateItemRequest } from '../../types/index';
import { generateId, calculateTicketTotals, determineItemStatus, determineTicketStatus, shouldSimulateFailure, simulateDelay } from '../../utils/helpers';

const router = Router();

// Helper to get POS config
async function getPosConfig() {
  const result = await pool.query('SELECT * FROM pos_config LIMIT 1');
  if (result.rows.length === 0) {
    throw new Error('POS not configured');
  }
  return result.rows[0];
}

// GET /api/v1/tickets/:ticketId/items - Get all items for a ticket
router.get('/:ticketId/items', async (req, res) => {
  try {
    await simulateDelay();
    
    if (shouldSimulateFailure()) {
      return res.status(500).json({
        success: false,
        error: 'Simulated server error',
      });
    }

    const { ticketId } = req.params;

    // Verify ticket exists
    const ticketResult = await pool.query(
      'SELECT * FROM tickets WHERE id = $1',
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    const itemsResult = await pool.query(
      'SELECT * FROM ticket_items WHERE ticket_id = $1 ORDER BY created_at',
      [ticketId]
    );

    const items: TicketItem[] = itemsResult.rows.map(row => ({
      id: row.id,
      ticket_id: row.ticket_id,
      name: row.name,
      unit_price: parseFloat(row.unit_price),
      quantity: row.quantity,
      paid_quantity: row.paid_quantity,
      notes: row.notes,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return res.json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    console.error('Error fetching items:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/v1/tickets/:ticketId/items - Add items to a ticket
router.post('/:ticketId/items', async (req, res) => {
  try {
    await simulateDelay();
    
    if (shouldSimulateFailure()) {
      return res.status(500).json({
        success: false,
        error: 'Simulated server error',
      });
    }

    const { ticketId } = req.params;
    const { items } = req.body as AddItemsRequest;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'items array is required',
      });
    }

    // Verify ticket exists and is open
    const ticketResult = await pool.query(
      'SELECT * FROM tickets WHERE id = $1',
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    const ticket = ticketResult.rows[0];
    if (ticket.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot add items to a cancelled ticket',
      });
    }

    if (ticket.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Cannot add items to a fully paid ticket',
      });
    }

    const config = await getPosConfig();
    const addedItems: TicketItem[] = [];

    // Insert items
    for (const item of items) {
      if (!item.name || item.unitPrice === undefined || !item.quantity) {
        return res.status(400).json({
          success: false,
          error: 'Each item must have name, unitPrice, and quantity',
        });
      }

      if (item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Quantity must be greater than 0',
        });
      }

      if (item.unitPrice < 0) {
        return res.status(400).json({
          success: false,
          error: 'Unit price must be non-negative',
        });
      }

      const itemId = generateId('item');
      const result = await pool.query(
        `INSERT INTO ticket_items (id, ticket_id, name, unit_price, quantity, paid_quantity, notes, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 0, $6, 'unpaid', NOW(), NOW())
         RETURNING *`,
        [itemId, ticketId, item.name, item.unitPrice, item.quantity, item.notes]
      );

      const row = result.rows[0];
      addedItems.push({
        id: row.id,
        ticket_id: row.ticket_id,
        name: row.name,
        unit_price: parseFloat(row.unit_price),
        quantity: row.quantity,
        paid_quantity: row.paid_quantity,
        notes: row.notes,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
    }

    // Get all items and recalculate totals
    const allItemsResult = await pool.query(
      'SELECT * FROM ticket_items WHERE ticket_id = $1',
      [ticketId]
    );

    const allItems: TicketItem[] = allItemsResult.rows.map(row => ({
      id: row.id,
      ticket_id: row.ticket_id,
      name: row.name,
      unit_price: parseFloat(row.unit_price),
      quantity: row.quantity,
      paid_quantity: row.paid_quantity,
      notes: row.notes,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    const totals = calculateTicketTotals(allItems, config.tax_rate);

    // Update ticket
    await pool.query(
      `UPDATE tickets SET subtotal = $1, tax = $2, total = $3, updated_at = NOW() WHERE id = $4`,
      [totals.subtotal, totals.tax, totals.total, ticketId]
    );

    return res.status(201).json({
      success: true,
      data: addedItems,
    });
  } catch (error: any) {
    console.error('Error adding items:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PATCH /api/v1/items/:itemId - Update an item (mainly for paid quantity)
router.patch('/:itemId', async (req, res) => {
  try {
    await simulateDelay();
    
    if (shouldSimulateFailure()) {
      return res.status(500).json({
        success: false,
        error: 'Simulated server error',
      });
    }

    const { itemId } = req.params;
    const { paidQuantity, notes } = req.body as UpdateItemRequest;

    // Get item
    const itemResult = await pool.query(
      'SELECT * FROM ticket_items WHERE id = $1',
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      });
    }

    const item = itemResult.rows[0];

    // Verify ticket is not cancelled
    const ticketResult = await pool.query(
      'SELECT * FROM tickets WHERE id = $1',
      [item.ticket_id]
    );

    const ticket = ticketResult.rows[0];
    if (ticket.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update items on a cancelled ticket',
      });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (paidQuantity !== undefined) {
      if (paidQuantity < 0 || paidQuantity > item.quantity) {
        return res.status(400).json({
          success: false,
          error: `paidQuantity must be between 0 and ${item.quantity}`,
        });
      }

      const newStatus = determineItemStatus(item.quantity, paidQuantity);
      updates.push(`paid_quantity = $${paramIndex++}`);
      values.push(paidQuantity);
      updates.push(`status = $${paramIndex++}`);
      values.push(newStatus);
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(itemId);

    const updateQuery = `UPDATE ticket_items SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const updateResult = await pool.query(updateQuery, values);

    const updatedRow = updateResult.rows[0];
    const updatedItem: TicketItem = {
      id: updatedRow.id,
      ticket_id: updatedRow.ticket_id,
      name: updatedRow.name,
      unit_price: parseFloat(updatedRow.unit_price),
      quantity: updatedRow.quantity,
      paid_quantity: updatedRow.paid_quantity,
      notes: updatedRow.notes,
      status: updatedRow.status,
      created_at: updatedRow.created_at,
      updated_at: updatedRow.updated_at,
    };

    // Update ticket status based on all items
    const allItemsResult = await pool.query(
      'SELECT * FROM ticket_items WHERE ticket_id = $1',
      [item.ticket_id]
    );

    const allItems: TicketItem[] = allItemsResult.rows.map(row => ({
      id: row.id,
      ticket_id: row.ticket_id,
      name: row.name,
      unit_price: parseFloat(row.unit_price),
      quantity: row.quantity,
      paid_quantity: row.paid_quantity,
      notes: row.notes,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    const newTicketStatus = determineTicketStatus(allItems);
    const closedAt = newTicketStatus === 'paid' ? 'NOW()' : 'NULL';

    await pool.query(
      `UPDATE tickets SET status = $1, closed_at = ${closedAt}, updated_at = NOW() WHERE id = $2`,
      [newTicketStatus, item.ticket_id]
    );

    return res.json({
      success: true,
      data: updatedItem,
    });
  } catch (error: any) {
    console.error('Error updating item:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
