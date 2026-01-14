import { Router } from 'express';
import pool from '../../db/connection.js';
import { Payment, TicketItem, CreatePaymentRequest } from '../../types/index.js';
import { generateId, determineItemStatus, determineTicketStatus, shouldSimulateFailure, simulateDelay } from '../../utils/helpers.js';

const router = Router();

// POST /api/v1/payments - Process external payment
router.post('/', async (req, res) => {
  try {
    await simulateDelay();
    
    if (shouldSimulateFailure()) {
      return res.status(500).json({
        success: false,
        error: 'Simulated server error',
      });
    }

    const { ticketId, items, amount, method, externalProvider, externalPaymentId } = req.body as CreatePaymentRequest;

    // Validate request
    if (!ticketId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ticketId and items array are required',
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount must be greater than 0',
      });
    }

    if (!method || !['card', 'cash', 'transfer'].includes(method)) {
      return res.status(400).json({
        success: false,
        error: 'method must be one of: card, cash, transfer',
      });
    }

    if (!externalProvider || !externalPaymentId) {
      return res.status(400).json({
        success: false,
        error: 'externalProvider and externalPaymentId are required',
      });
    }

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

    const ticket = ticketResult.rows[0];

    // FAILURE MODE: Ticket already paid
    if (ticket.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Ticket is already fully paid',
      });
    }

    // FAILURE MODE: Ticket closed
    if (ticket.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Ticket is cancelled',
      });
    }

    // Get all ticket items
    const itemsResult = await pool.query(
      'SELECT * FROM ticket_items WHERE ticket_id = $1',
      [ticketId]
    );

    const ticketItems = new Map<string, any>();
    itemsResult.rows.forEach(row => {
      ticketItems.set(row.id, row);
    });

    // Validate payment items and calculate expected amount
    let calculatedAmount = 0;
    const itemUpdates: { itemId: string; newPaidQuantity: number }[] = [];

    for (const paymentItem of items) {
      if (!paymentItem.itemId || !paymentItem.quantity) {
        return res.status(400).json({
          success: false,
          error: 'Each payment item must have itemId and quantity',
        });
      }

      const ticketItem = ticketItems.get(paymentItem.itemId);
      if (!ticketItem) {
        return res.status(404).json({
          success: false,
          error: `Item ${paymentItem.itemId} not found on ticket`,
        });
      }

      const availableQuantity = ticketItem.quantity - ticketItem.paid_quantity;

      // FAILURE MODE: Item already paid
      if (availableQuantity === 0) {
        return res.status(400).json({
          success: false,
          error: `Item ${paymentItem.itemId} (${ticketItem.name}) is already fully paid`,
        });
      }

      // FAILURE MODE: Quantity not available
      if (paymentItem.quantity > availableQuantity) {
        return res.status(400).json({
          success: false,
          error: `Only ${availableQuantity} units of ${ticketItem.name} are available for payment (${ticketItem.paid_quantity} already paid)`,
        });
      }

      calculatedAmount += parseFloat(ticketItem.unit_price) * paymentItem.quantity;
      itemUpdates.push({
        itemId: paymentItem.itemId,
        newPaidQuantity: ticketItem.paid_quantity + paymentItem.quantity,
      });
    }

    // Round to 2 decimal places
    calculatedAmount = Math.round(calculatedAmount * 100) / 100;

    // FAILURE MODE: Payment amount mismatch
    if (Math.abs(calculatedAmount - amount) > 0.01) {
      return res.status(400).json({
        success: false,
        error: `Payment amount mismatch. Expected ${calculatedAmount}, got ${amount}`,
      });
    }

    // Create payment record
    const paymentId = generateId('payment');
    const paymentResult = await pool.query(
      `INSERT INTO payments (id, ticket_id, amount, method, external_provider, external_payment_id, status, items, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7, NOW(), NOW())
       RETURNING *`,
      [paymentId, ticketId, amount, method, externalProvider, externalPaymentId, JSON.stringify(items)]
    );

    const paymentRow = paymentResult.rows[0];

    // Update item paid quantities
    for (const update of itemUpdates) {
      const item = ticketItems.get(update.itemId);
      const newStatus = determineItemStatus(item.quantity, update.newPaidQuantity);
      
      await pool.query(
        `UPDATE ticket_items SET paid_quantity = $1, status = $2, updated_at = NOW() WHERE id = $3`,
        [update.newPaidQuantity, newStatus, update.itemId]
      );
    }

    // Get updated items to determine ticket status
    const updatedItemsResult = await pool.query(
      'SELECT * FROM ticket_items WHERE ticket_id = $1',
      [ticketId]
    );

    const updatedItems: TicketItem[] = updatedItemsResult.rows.map(row => ({
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

    const newTicketStatus = determineTicketStatus(updatedItems);
    const closedAt = newTicketStatus === 'paid' ? 'NOW()' : ticket.closed_at;

    // Update ticket status
    await pool.query(
      `UPDATE tickets SET status = $1, closed_at = $2, updated_at = NOW() WHERE id = $3`,
      [newTicketStatus, closedAt, ticketId]
    );

    const payment: Payment = {
      id: paymentRow.id,
      ticket_id: paymentRow.ticket_id,
      amount: parseFloat(paymentRow.amount),
      method: paymentRow.method,
      external_provider: paymentRow.external_provider,
      external_payment_id: paymentRow.external_payment_id,
      status: paymentRow.status,
      items: typeof paymentRow.items === 'string' ? JSON.parse(paymentRow.items) : paymentRow.items,
      created_at: paymentRow.created_at,
      updated_at: paymentRow.updated_at,
    };

    return res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    console.error('Error processing payment:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/v1/payments?ticketId=xxx - Get payments for a ticket
router.get('/', async (req, res) => {
  try {
    await simulateDelay();
    
    if (shouldSimulateFailure()) {
      return res.status(500).json({
        success: false,
        error: 'Simulated server error',
      });
    }

    const { ticketId } = req.query;

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        error: 'ticketId query parameter is required',
      });
    }

    const result = await pool.query(
      'SELECT * FROM payments WHERE ticket_id = $1 ORDER BY created_at DESC',
      [ticketId]
    );

    const payments: Payment[] = result.rows.map(row => ({
      id: row.id,
      ticket_id: row.ticket_id,
      amount: parseFloat(row.amount),
      method: row.method,
      external_provider: row.external_provider,
      external_payment_id: row.external_payment_id,
      status: row.status,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return res.json({
      success: true,
      data: payments,
    });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
