import { Router, Request, Response } from 'express';
import pool from '../../db/connection';
import { Payment, CreatePaymentRequest } from '../../types/index';
import { shouldSimulateFailure, simulateDelay } from '../../utils/helpers';

const router = Router();

// POST /api/v1/payments - Process external payment
router.post('/', async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    await simulateDelay();
    
    if (shouldSimulateFailure()) {
      await client.query('ROLLBACK');
      return res.status(500).json({
        success: false,
        error: 'Simulated server error',
      });
    }

    const { ticket_id, items, amount, method, externalProvider, externalPaymentId } = req.body as CreatePaymentRequest;

    // Validate request
    if (!ticket_id || !items || !Array.isArray(items) || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'ticket_id and items array are required',
      });
    }

    const ticketId = ticket_id;

    if (!amount || amount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'amount must be greater than 0',
      });
    }

    // Convert method to uppercase
    const methodUpper = method?.toUpperCase();
    if (!methodUpper || !['CARD', 'CASH'].includes(methodUpper)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'method must be one of: CARD, CASH',
      });
    }

    if (!externalProvider || !externalPaymentId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'externalProvider and externalPaymentId are required',
      });
    }

    // Convert to snake_case for consistency
    const external_payment_id = externalPaymentId;
    const external_provider = externalProvider;

    // Get ticket
    const ticketResult = await client.query(
      'SELECT * FROM tickets WHERE tickets.id = $1',
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    const ticket = ticketResult.rows[0];

    // FAILURE MODE: Ticket already paid
    if (ticket.status === 'PAID') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Ticket is already fully paid',
      });
    }

    // FAILURE MODE: Ticket closed
    if (ticket.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Ticket is cancelled',
      });
    }

    // Get all ticket items
    const itemsResult = await client.query(
      `SELECT
        ticket_items.id,
        ticket_items.ticket_id,
        ticket_items.name,
        ticket_items.price,
        ticket_items.quantity,
        ticket_items.paid_amount,
        ticket_items.created_at
      FROM ticket_items 
      WHERE ticket_items.ticket_id = $1`,
      [ticketId]
    );

    const ticketItems = new Map<string, any>();
    itemsResult.rows.forEach(row => {
      ticketItems.set(row.id, row);
    });

    // Validate payment items and calculate expected amount
    let calculatedAmount = 0;
    const paymentItemsData: { ticketItemId: string; amount: number; quantity: number }[] = [];

    for (const paymentItem of items) {
      if (!paymentItem.itemId || !paymentItem.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Each payment item must have itemId and quantity',
        });
      }

      const ticketItem = ticketItems.get(paymentItem.itemId);
      if (!ticketItem) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: `Item ${paymentItem.itemId} not found on ticket`,
        });
      }

      const itemPrice = ticketItem.price;
      const itemTotal = itemPrice * paymentItem.quantity;
      calculatedAmount += itemTotal;
      
      paymentItemsData.push({
        ticketItemId: paymentItem.itemId,
        amount: itemTotal,
        quantity: paymentItem.quantity,
      });
    }

    // Round to integer (cents)
    calculatedAmount = Math.round(calculatedAmount);

    // FAILURE MODE: Payment amount mismatch
    if (Math.abs(calculatedAmount - amount) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Payment amount mismatch. Expected ${calculatedAmount}, got ${amount}`,
      });
    }

    // Insert payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (
        external_payment_id,
        external_provider,
        method,
        ticket_id,
        amount,
        currency,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMED')
      RETURNING 
        payments.id,
        payments.ticket_id,
        payments.external_payment_id,
        payments.external_provider,
        payments.method,
        payments.amount AS payment_amount,
        payments.currency,
        payments.status,
        payments.created_at`,
      [external_payment_id, external_provider, methodUpper, ticketId, amount, ticket.currency || 'DOP']
    );

    const paymentRow = paymentResult.rows[0];
    const paymentId = paymentRow.id;

    // Insert payment items
    for (const paymentItem of paymentItemsData) {
      await client.query(
        `INSERT INTO payment_items (
          payment_id,
          ticket_item_id,
          amount,
          quantity
        )
        VALUES ($1, $2, $3, $4)`,
        [paymentId, paymentItem.ticketItemId, paymentItem.amount, paymentItem.quantity]
      );

      // Update ticket_item paid_amount (sum of all payment_items for this ticket_item)
      const paidAmountResult = await client.query(
        `SELECT COALESCE(SUM(pi.amount), 0) as total_paid
         FROM payment_items pi
         JOIN payments p ON pi.payment_id = p.id
         WHERE pi.ticket_item_id = $1 AND p.status = 'CONFIRMED'`,
        [paymentItem.ticketItemId]
      );

      const totalPaid = parseInt(paidAmountResult.rows[0].total_paid);
      const ticketItem = ticketItems.get(paymentItem.ticketItemId);
      const itemTotalPrice = ticketItem.price * ticketItem.quantity;
      
      // Update paid_amount (is_paid is derived, not stored)
      await client.query(
        `UPDATE ticket_items 
         SET paid_amount = $1 
         WHERE ticket_items.id = $2`,
        [totalPaid, paymentItem.ticketItemId]
      );
    }

    // Update ticket status based on all items
    const allItemsResult = await client.query(
      `SELECT 
        ticket_items.paid_amount,
        ticket_items.price,
        ticket_items.quantity,
        (ticket_items.price * ticket_items.quantity) as total_price 
       FROM ticket_items 
       WHERE ticket_items.ticket_id = $1`,
      [ticketId]
    );

    const allPaid = allItemsResult.rows.every((row: any) => row.paid_amount >= row.total_price);
    const somePaid = allItemsResult.rows.some((row: any) => row.paid_amount > 0);

    let newStatus = 'OPEN';
    if (allPaid) {
      newStatus = 'PAID';
    } else if (somePaid) {
      newStatus = 'PARTIALLY_PAID';
    }

    await client.query(
      `UPDATE tickets 
       SET status = $1, 
           updated_at = NOW() 
       WHERE tickets.id = $2`,
      [newStatus, ticketId]
    );

    await client.query('COMMIT');

    // Fetch payment with items
    const paymentItemsResult = await client.query(
      `SELECT pi.*, ti.name as item_name
       FROM payment_items pi
       JOIN ticket_items ti ON pi.ticket_item_id = ti.id
       WHERE pi.payment_id = $1`,
      [paymentId]
    );

    const payment: Payment = {
      id: paymentRow.id,
      ticket_id: paymentRow.ticket_id,
      external_payment_id: paymentRow.external_payment_id,
      external_provider: paymentRow.external_provider,
      method: paymentRow.method,
      amount: paymentRow.payment_amount,
      currency: paymentRow.currency,
      status: paymentRow.status,
      created_at: paymentRow.created_at,
    };

    return res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error processing payment:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    client.release();
  }
});

// GET /api/v1/payments?ticketId=xxx - Get payments for a ticket
router.get('/', async (req: Request, res: Response) => {
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
      'SELECT * FROM payments WHERE payments.ticket_id = $1 ORDER BY payments.created_at DESC',
      [ticketId]
    );

    // Fetch payment_items for each payment
    const payments: any[] = [];
    for (const row of result.rows) {
      const itemsResult = await pool.query(
        `SELECT 
          pi.id,
          pi.payment_id,
          pi.ticket_item_id,
          pi.amount,
          pi.quantity,
          ti.name as item_name
         FROM payment_items pi
         JOIN ticket_items ti ON pi.ticket_item_id = ti.id
         WHERE pi.payment_id = $1`,
        [row.id]
      );

      payments.push({
        id: row.id,
        ticket_id: row.ticket_id,
        external_payment_id: row.external_payment_id,
        external_provider: row.external_provider,
        method: row.method,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        created_at: row.created_at,
        items: itemsResult.rows.map((item: any) => ({
          itemId: item.ticket_item_id,
          itemName: item.item_name,
          amount: item.amount,
          quantity: item.quantity,
        })),
      });
    }

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
