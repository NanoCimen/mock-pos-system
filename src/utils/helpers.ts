import { TicketItem } from '../types/index';

// Generate unique IDs
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Calculate ticket totals from items
export function calculateTicketTotals(
  items: TicketItem[],
  taxRate: number
): { subtotal: number; tax: number; total: number } {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// Calculate total paid amount for a ticket
export function calculatePaidAmount(items: TicketItem[]): number {
  const paidAmount = items.reduce(
    (sum, item) => sum + item.unit_price * item.paid_quantity,
    0
  );
  return Math.round(paidAmount * 100) / 100;
}

// Determine ticket status based on items
export function determineTicketStatus(items: TicketItem[]): 'open' | 'partially_paid' | 'paid' {
  const allPaid = items.every(item => item.status === 'paid');
  const somePaid = items.some(item => item.status === 'paid' || item.status === 'partially_paid');
  
  if (allPaid) return 'paid';
  if (somePaid) return 'partially_paid';
  return 'open';
}

// Determine item status based on paid quantity
export function determineItemStatus(quantity: number, paidQuantity: number): 'unpaid' | 'partially_paid' | 'paid' {
  if (paidQuantity === 0) return 'unpaid';
  if (paidQuantity >= quantity) return 'paid';
  return 'partially_paid';
}

// Simulate random failures (for dev mode)
export function shouldSimulateFailure(): boolean {
  const failureRate = parseFloat(process.env.FAILURE_RATE || '0');
  return Math.random() < failureRate;
}

// Simulate network delay
export async function simulateDelay(ms?: number): Promise<void> {
  const delay = ms || parseInt(process.env.SIMULATED_DELAY_MS || '0');
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
