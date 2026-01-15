import { Router, Request, Response } from 'express';
import pool from '../../db/connection';
import { Ticket, TicketItem, CreateTicketRequest } from '../../types/index';
import { shouldSimulateFailure, simulateDelay } from '../../utils/helpers';

const router = Router();

// GET /api/v1/tickets - List all tickets
router.get('/', async (req: Request, res: Response) => {
  try {
    await simulateDelay();
    
    if (shouldSimulateFailure()) {
      return res.status(500).json({
        success: false,
        error: 'Simulated server error',
      });
    }

    const { status, mesaId } = req.query;
    let query = 'SELECT * FROM tickets WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND tickets.status = $${paramIndex++}`;
      params.push(status);
    }
    if (mesaId) {
      query += ` AND tickets.mesa_id = $${paramIndex++}`;
      params.push(mesaId);
    }

    query += ' ORDER BY tickets.created_at DESC';

    const result = await pool.query(query, params);
    const tickets: Ticket[] = [];

    // Fetch items for each ticket
    for (const row of result.rows) {
      const itemsResult = await pool.query(
        `SELECT
          ticket_items.id,
          ticket_items.ticket_id,
          ticket_items.name,
          ticket_items.price,
          ticket_items.quantity,
          ticket_items.paid_amount,
          ticket_items.created_at
        FROM ticket_items
        WHERE ticket_items.ticket_id = $1
        ORDER BY ticket_items.created_at`,
        [row.id]
      );

      const items: TicketItem[] = itemsResult.rows.map((itemRow: any) => {
        const paidAmount = itemRow.paid_amount || 0;
        const itemTotalPrice = itemRow.price * itemRow.quantity;
        return {
          id: itemRow.id,
          ticket_id: itemRow.ticket_id,
          name: itemRow.name,
          price: itemRow.price,
          quantity: itemRow.quantity,
          paid_amount: paidAmount,
          is_paid: paidAmount >= itemTotalPrice,
          created_at: itemRow.created_at,
        };
      });

      tickets.push({
        id: row.id,
        restaurant_id: row.restaurant_id,
        mesa_id: row.mesa_id,
        status: row.status,
        total_amount: row.total_amount,
        currency: row.currency,
        created_at: row.created_at,
        updated_at: row.updated_at,
        items,
      });
    }

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
router.get('/:ticketId', async (req: Request, res: Response) => {
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
      'SELECT * FROM tickets WHERE tickets.id = $1',
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
      `SELECT
        ticket_items.id,
        ticket_items.ticket_id,
        ticket_items.name,
        ticket_items.price,
        ticket_items.quantity,
        ticket_items.paid_amount,
        ticket_items.created_at
      FROM ticket_items
      WHERE ticket_items.ticket_id = $1
      ORDER BY ticket_items.created_at`,
      [ticketId]
    );

    const items: TicketItem[] = itemsResult.rows.map((itemRow: any) => {
      const paidAmount = itemRow.paid_amount || 0;
      const itemTotalPrice = itemRow.price * itemRow.quantity;
      return {
        id: itemRow.id,
        ticket_id: itemRow.ticket_id,
        name: itemRow.name,
        price: itemRow.price,
        quantity: itemRow.quantity,
        paid_amount: paidAmount,
        is_paid: paidAmount >= itemTotalPrice,
        created_at: itemRow.created_at,
      };
    });

    const ticket: Ticket = {
      id: ticketRow.id,
      restaurant_id: ticketRow.restaurant_id,
      mesa_id: ticketRow.mesa_id,
      status: ticketRow.status,
      total_amount: ticketRow.total_amount,
      currency: ticketRow.currency,
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
router.post('/', async (req: Request, res: Response) => {
  try {
    await simulateDelay();
    
    if (shouldSimulateFailure()) {
      return res.status(500).json({
        success: false,
        error: 'Simulated server error',
      });
    }

    const { restaurant_id, mesa_id } = req.body as CreateTicketRequest;

    if (!restaurant_id || !mesa_id) {
      return res.status(400).json({
        success: false,
        error: 'restaurant_id and mesa_id are required',
      });
    }

    const result = await pool.query(
      `INSERT INTO tickets (restaurant_id, mesa_id, status, total_amount, currency, created_at, updated_at)
       VALUES ($1, $2, 'OPEN', 0, 'DOP', NOW(), NOW())
       RETURNING 
         tickets.id,
         tickets.restaurant_id,
         tickets.mesa_id,
         tickets.status,
         tickets.total_amount,
         tickets.currency,
         tickets.created_at,
         tickets.updated_at`,
      [restaurant_id, mesa_id]
    );

    const ticketRow = result.rows[0];
    const ticket: Ticket = {
      id: ticketRow.id,
      restaurant_id: ticketRow.restaurant_id,
      mesa_id: ticketRow.mesa_id,
      status: ticketRow.status,
      total_amount: ticketRow.total_amount,
      currency: ticketRow.currency,
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

export default router;
