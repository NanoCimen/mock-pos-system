export interface Restaurant {
  id: number;
  name: string;
  tax_rate: number;
  currency: string;
  created_at: Date;
}

export interface Table {
  id: number;
  restaurant_id: number;
  table_number: number;
  seats: number;
  status: 'available' | 'occupied' | 'reserved';
  current_bill_id?: number;
  created_at: Date;
}

export interface MenuItem {
  id: number;
  restaurant_id: number;
  name: string;
  category: 'appetizer' | 'main' | 'dessert' | 'beverage' | 'other';
  price: number;
  description?: string;
  available: boolean;
  created_at: Date;
}

export interface BillItem {
  id: number;
  bill_id: number;
  menu_item_id: number;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  created_at: Date;
}

export interface Bill {
  id: number;
  restaurant_id: number;
  table_id: number;
  table_number: number;
  status: 'open' | 'paid' | 'cancelled';
  subtotal: number;
  tax: number;
  total: number;
  payment_method?: 'cash' | 'card' | 'external';
  paid_at?: Date;
  created_at: Date;
  updated_at: Date;
  items?: BillItem[];
}
