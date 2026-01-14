import { Router } from 'express';
import pool from '../../db/connection';
import { Ticket, TicketItem, CreateTicketRequest, AddItemsRequest } from '../../types/index';
import { generateId, calculateTicketTotals, determineTicketStatus, shouldSimulateFailure, simulateDelay } from '../../utils/helpers';

const router = Router();

// Helper to get POS config
async function getPosConfig() {
  const result = await pool.query('SELECT * FROM pos_config LIMIT 1');
  if (result.rows.length === 0) {
    throw new Error('POS not configured');
  }
  return result.rows[0];
}

// GET /api/v1/tickets - List all tickets
router.get('/', async (req, res) => {
  try {
    await simulateDelay();
    
    if (shouldSimulateFailure()) {
      return res.status(500).json({
        success: false,
        error: 'Simulated server error',
      });
    }

    const { status, tableId } = req.query;
    let query = 'SELECT * FROM tickets WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (tableId) {
      query += ` AND table_id = $${paramIndex++}`;
      params.push(tableId);
    }

    query += ' ORDER BY opened_at DESC';

    const result = await pool.query(query, params);
    const tickets: Ticket[] = result.rows.map(row => ({
      id: row.id,
      table_id: row.table_id,
      status: row.status,
      currency: row.currency,
      subtotal: parseFloat(row.subtotal),
      tax: parseFloat(row.tax),
      total: parseFloat(row.total),
      opened_at: row.opened_at,
      closed_at: row.closed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return res.json({
      success: true,
      data: tickets,
    });
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/v1/tickets/:ticketId - Get ticket by ID with items
router.get('/:ticketId', async (req, res) => {
  try {
    await simulateDelay();
    
    if (shouldSimulateFailure()) {
      return res.status(500).json({
        success: false,
        error: 'Simulated server error',
      });
    }

    const { ticketId } = req.params;

    // Get ticket
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

    const ticketRow = ticketResult.rows[0];

    // Get items
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

    const ticket: Ticket = {
      id: ticketRow.id,
      table_id: ticketRow.table_id,
      status: ticketRow.status,
      currency: ticketRow.currency,
      subtotal: parseFloat(ticketRow.subtotal),
      tax: parseFloat(ticketRow.tax),
      total: parseFloat(ticketRow.total),
      opened_at: ticketRow.opened_at,
      closed_at: ticketRow.closed_at,
      created_at: ticketRow.created_at,
      updated_at: ticketRow.updated_at,
      items,
    };

    return res.json({
      success: true,
      data: ticket,
    });
  } catch (error: any) {
    console.error('Error fetching ticket:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/v1/tickets - Create new ticket
router.post('/', async (req, res) => {
  try {
    await simulateDelay();
    
    if (shouldSimulateFailure()) {
      return res.status(500).json({
        success: false,
        error: 'Simulated server error',
      });
    }

    const { tableId } = req.body as CreateTicketRequest;

    if (!tableId) {
      return res.status(400).json({
        success: false,
        error: 'tableId is required',
      });
    }

    const config = await getPosConfig();
    const ticketId = generateId('ticket');

    const result = await pool.query(
      `INSERT INTO tickets (id, table_id, status, currency, subtotal, tax, total, opened_at, created_at, updated_at)
       VALUES ($1, $2, 'open', $3, 0, 0, 0, NOW(), NOW(), NOW())
       RETURNING *`,
      [ticketId, tableId, config.currency]
    );

    const ticketRow = result.rows[0];
    const ticket: Ticket = {
      id: ticketRow.id,
      table_id: ticketRow.table_id,
      status: ticketRow.status,
      currency: ticketRow.currency,
      subtotal: parseFloat(ticketRow.subtotal),
      tax: parseFloat(ticketRow.tax),
      total: parseFloat(ticketRow.total),
      opened_at: ticketRow.opened_at,
      closed_at: ticketRow.closed_at,
      created_at: ticketRow.created_at,
      updated_at: ticketRow.updated_at,
      items: [],
    };

    return res.status(201).json({
      success: true,
      data: ticket,
    });
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/v1/tickets/:ticketId/close - Close a ticket
router.post('/:ticketId/close', async (req, res) => {
  try {
    await simulateDelay();
    
    if (shouldSimulateFailure()) {
      return res.status(500).json({
        success: false,
        error: 'Simulated server error',
      });
    }

    const { ticketId } = req.params;

    // Check if ticket exists and is open
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
        error: 'Ticket already cancelled',
      });
    }

    if (ticket.closed_at) {
      return res.status(400).json({
        success: false,
        error: 'Ticket already closed',
      });
    }

    // Update ticket
    const updateResult = await pool.query(
      `UPDATE tickets SET status = 'cancelled', closed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [ticketId]
    );

    const updatedRow = updateResult.rows[0];
    const updatedTicket: Ticket = {
      id: updatedRow.id,
      table_id: updatedRow.table_id,
      status: updatedRow.status,
      currency: updatedRow.currency,
      subtotal: parseFloat(updatedRow.subtotal),
      tax: parseFloat(updatedRow.tax),
      total: parseFloat(updatedRow.total),
      opened_at: updatedRow.opened_at,
      closed_at: updatedRow.closed_at,
      created_at: updatedRow.created_at,
      updated_at: updatedRow.updated_at,
    };

    return res.json({
      success: true,
      data: updatedTicket,
    });
  } catch (error: any) {
    console.error('Error closing ticket:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
