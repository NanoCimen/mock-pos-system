// Ticket (YAPos production model)
export interface Ticket {
  id: string; // UUID
  restaurant_id: string;
  mesa_id: string;
  status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID';
  total_amount: number; // in cents
  currency: string;
  created_at: Date;
  updated_at: Date;
  items?: TicketItem[];
}

// Ticket Item
export interface TicketItem {
  id: string; // UUID
  ticket_id: string; // UUID
  name: string;
  price: number; // in cents
  quantity: number;
  is_paid: boolean;
  paid_amount: number; // in cents
  created_at: Date;
}

// Payment (External)
export interface Payment {
  id: string; // UUID
  ticket_id: string; // UUID
  external_payment_id: string;
  external_provider: string;
  amount: number; // in cents
  method: 'CARD' | 'CASH';
  status: 'CONFIRMED' | 'FAILED';
  currency: string;
  created_at: Date;
  items?: PaymentItemDetail[];
}

// Payment Item Detail (for GET responses)
export interface PaymentItemDetail {
  itemId: string;
  itemName: string;
  amount: number;
  quantity: number;
}

// API Request/Response types
export interface CreateTicketRequest {
  restaurant_id: string;
  mesa_id: string;
}

export interface AddItemsRequest {
  items: {
    name: string;
    price: number; // in cents
    quantity: number;
  }[];
}

export interface CreatePaymentRequest {
  ticket_id: string;
  items: PaymentItem[];
  amount: number; // in cents
  method: 'card' | 'cash' | 'CARD' | 'CASH'; // Accept both formats
  externalProvider: string;
  externalPaymentId: string;
}

export interface PaymentItem {
  itemId: string;
  quantity: number;
}

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// POS Capabilities
export interface PosCapabilities {
  supportsPartialPayments: boolean;
  supportsItemLocking: boolean;
  supportsWebhooks: boolean;
  supportsRefunds: boolean;
  currency: string[];
}
