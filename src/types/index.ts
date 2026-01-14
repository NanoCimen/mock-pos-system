// POS Configuration
export interface PosConfig {
  id: number;
  name: string;
  currency: 'DOP' | 'USD';
  tax_rate: number;
  created_at: Date;
}

// Ticket (replaces Bill)
export interface Ticket {
  id: string;
  table_id: string;
  status: 'open' | 'partially_paid' | 'paid' | 'cancelled';
  currency: 'DOP' | 'USD';
  subtotal: number;
  tax: number;
  total: number;
  opened_at: Date;
  closed_at?: Date;
  created_at: Date;
  updated_at: Date;
  items?: TicketItem[];
}

// Ticket Item (with partial payment support)
export interface TicketItem {
  id: string;
  ticket_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  paid_quantity: number;
  notes?: string;
  status: 'unpaid' | 'partially_paid' | 'paid';
  created_at: Date;
  updated_at: Date;
}

// Payment (External)
export interface Payment {
  id: string;
  ticket_id: string;
  amount: number;
  method: 'card' | 'cash' | 'transfer';
  external_provider: string;
  external_payment_id: string;
  status: 'pending' | 'confirmed' | 'failed';
  items: PaymentItem[];
  created_at: Date;
  updated_at: Date;
}

export interface PaymentItem {
  itemId: string;
  quantity: number;
}

// API Request/Response types
export interface CreateTicketRequest {
  tableId: string;
}

export interface AddItemsRequest {
  items: {
    name: string;
    unitPrice: number;
    quantity: number;
    notes?: string;
  }[];
}

export interface UpdateItemRequest {
  paidQuantity?: number;
  notes?: string;
}

export interface CreatePaymentRequest {
  ticketId: string;
  items: PaymentItem[];
  amount: number;
  method: 'card' | 'cash' | 'transfer';
  externalProvider: string;
  externalPaymentId: string;
}

export interface PosCapabilities {
  supportsPartialPayments: boolean;
  supportsItemLocking: boolean;
  supportsWebhooks: boolean;
  supportsRefunds: boolean;
  currency: string[];
}

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
