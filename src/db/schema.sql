-- Enable UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id TEXT NOT NULL,
  mesa_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'PARTIALLY_PAID', 'PAID')),
  total_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'DOP',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ticket items
CREATE TABLE IF NOT EXISTS ticket_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id),
  external_payment_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
