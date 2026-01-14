-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS ticket_items CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS pos_config CASCADE;

-- POS Configuration
CREATE TABLE pos_config (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  currency VARCHAR(3) DEFAULT 'DOP',
  tax_rate DECIMAL(5,4) DEFAULT 0.18,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tickets (replaces bills)
CREATE TABLE tickets (
  id VARCHAR(50) PRIMARY KEY,
  table_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'partially_paid', 'paid', 'cancelled')),
  currency VARCHAR(3) DEFAULT 'DOP',
  subtotal DECIMAL(10,2) DEFAULT 0 CHECK (subtotal >= 0),
  tax DECIMAL(10,2) DEFAULT 0 CHECK (tax >= 0),
  total DECIMAL(10,2) DEFAULT 0 CHECK (total >= 0),
  opened_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ticket Items (with partial payment support)
CREATE TABLE ticket_items (
  id VARCHAR(50) PRIMARY KEY,
  ticket_id VARCHAR(50) REFERENCES tickets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  paid_quantity INTEGER DEFAULT 0 CHECK (paid_quantity >= 0),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_paid_quantity CHECK (paid_quantity <= quantity)
);

-- External Payments
CREATE TABLE payments (
  id VARCHAR(50) PRIMARY KEY,
  ticket_id VARCHAR(50) REFERENCES tickets(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  method VARCHAR(20) NOT NULL CHECK (method IN ('card', 'cash', 'transfer')),
  external_provider VARCHAR(50) NOT NULL,
  external_payment_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  items JSONB NOT NULL, -- Array of {itemId, quantity}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_tickets_table ON tickets(table_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_ticket_items_ticket ON ticket_items(ticket_id);
CREATE INDEX idx_ticket_items_status ON ticket_items(status);
CREATE INDEX idx_payments_ticket ON payments(ticket_id);
CREATE INDEX idx_payments_status ON payments(status);
