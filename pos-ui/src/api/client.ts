import axios from 'axios';

const API_URL = import.meta.env.VITE_POS_API_URL
  || (import.meta.env.DEV ? 'http://localhost:3000/api/v1' : 'https://pos.yap.net.do/api/v1');
const API_KEY = import.meta.env.VITE_POS_API_KEY || 'dev-api-key-12345';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'X-POS-API-KEY': API_KEY,
    'Content-Type': 'application/json',
  },
});

export interface PosTable {
  id: string;
  mesa_id: string;
  label: string;
  seats: number;
  created_at: string;
}

export interface TicketItem {
  id: string;
  ticket_id: string;
  name: string;
  price: number;
  quantity: number;
  paid_amount: number;
  is_paid: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  restaurant_id: string;
  mesa_id: string;
  status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID';
  total_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  items?: TicketItem[];
}

export async function getTables(): Promise<PosTable[]> {
  const { data } = await api.get<{ success: boolean; data: PosTable[] }>('/tables');
  return data.data;
}

export async function createTable(mesa_id: string, label: string, seats: number): Promise<PosTable> {
  const { data } = await api.post<{ success: boolean; data: PosTable }>('/tables', {
    mesa_id,
    label,
    seats,
  });
  return data.data;
}

export async function getTickets(params?: { status?: string; mesaId?: string }): Promise<Ticket[]> {
  const { data } = await api.get<{ success: boolean; data: Ticket[] }>('/tickets', { params });
  return data.data;
}

export async function getTicket(ticketId: string): Promise<Ticket> {
  const { data } = await api.get<{ success: boolean; data: Ticket }>(`/tickets/${ticketId}`);
  return data.data;
}

export async function createTicket(restaurant_id: string, mesa_id: string): Promise<Ticket> {
  const { data } = await api.post<{ success: boolean; data: Ticket }>('/tickets', {
    restaurant_id,
    mesa_id,
  });
  return data.data;
}

export async function addItems(
  ticketId: string,
  items: { name: string; price: number; quantity: number }[]
): Promise<TicketItem[]> {
  const { data } = await api.post<{ success: boolean; data: TicketItem[] }>(
    `/tickets/${ticketId}/items`,
    { items }
  );
  return data.data;
}

export async function removeItem(itemId: string): Promise<void> {
  await api.delete(`/items/${itemId}`);
}
