-- Drop existing tables if they exist (for clean setup)

DROP TABLE IF EXISTS bill_items CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;

-- Restaurants table
CREATE TABLE restaurants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tax_rate DECIMAL(5,4) DEFAULT 0.18,
  currency VARCHAR(3) DEFAULT 'DOP',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tables table
CREATE TABLE tables (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  seats INTEGER DEFAULT 4,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
  current_bill_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(restaurant_id, table_number)
);

-- Menu items table
CREATE TABLE menu_items (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) CHECK (category IN ('appetizer', 'main', 'dessert', 'beverage', 'other')),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  description TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bills table
CREATE TABLE bills (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id INTEGER REFERENCES tables(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'paid', 'cancelled')),
  subtotal DECIMAL(10,2) DEFAULT 0 CHECK (subtotal >= 0),
  tax DECIMAL(10,2) DEFAULT 0 CHECK (tax >= 0),
  total DECIMAL(10,2) DEFAULT 0 CHECK (total >= 0),
  payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'external')),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bill items table (order items)
CREATE TABLE bill_items (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
  menu_item_id INTEGER REFERENCES menu_items(id),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_tables_restaurant ON tables(restaurant_id);
CREATE INDEX idx_tables_status ON tables(status);
CREATE INDEX idx_bills_table ON bills(table_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bill_items_bill ON bill_items(bill_id);

