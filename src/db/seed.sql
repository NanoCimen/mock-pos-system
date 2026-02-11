-- Tables (mesas) for POS UI and YAP testing (run after migration 20260203_create_tables)
INSERT INTO tables (mesa_id, label, seats) VALUES
  ('mesa_1', 'Table 1', 4),
  ('mesa_2', 'Table 2', 4)
ON CONFLICT (mesa_id) DO NOTHING;

-- All amounts in whole DOP (320 = 320 DOP, not cents)
-- Create one open ticket (15 DOP total)
INSERT INTO tickets (
  id, restaurant_id, mesa_id, status, total_amount, currency
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'stripe_test_restaurant',
  'mesa_1',
  'OPEN',
  15,
  'DOP'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ticket_items (ticket_id, name, price, quantity)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Burger', 8, 1),
  ('11111111-1111-1111-1111-111111111111', 'Fries', 4, 1),
  ('11111111-1111-1111-1111-111111111111', 'Soda', 3, 1);

-- Ticket mesa_2: Pizza 1200 + Pasta 1000 + Wine 1000 = 3200 DOP
INSERT INTO tickets (
  id, restaurant_id, mesa_id, status, total_amount, currency
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'test_restaurant',
  'mesa_2',
  'OPEN',
  3200,
  'DOP'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ticket_items (ticket_id, name, price, quantity)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'Pizza', 1200, 1),
  ('22222222-2222-2222-2222-222222222222', 'Pasta', 1000, 1),
  ('22222222-2222-2222-2222-222222222222', 'Wine', 1000, 1);

-- Fix existing rows if DB had cents before (whole DOP now)
UPDATE tickets SET total_amount = 3200 WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE tickets SET total_amount = 15 WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE ticket_items SET price = 1200 WHERE ticket_id = '22222222-2222-2222-2222-222222222222' AND name = 'Pizza';
UPDATE ticket_items SET price = 1000 WHERE ticket_id = '22222222-2222-2222-2222-222222222222' AND name = 'Pasta';
UPDATE ticket_items SET price = 1000 WHERE ticket_id = '22222222-2222-2222-2222-222222222222' AND name = 'Wine';
UPDATE ticket_items SET price = 8 WHERE ticket_id = '11111111-1111-1111-1111-111111111111' AND name = 'Burger';
UPDATE ticket_items SET price = 4 WHERE ticket_id = '11111111-1111-1111-1111-111111111111' AND name = 'Fries';
UPDATE ticket_items SET price = 3 WHERE ticket_id = '11111111-1111-1111-1111-111111111111' AND name = 'Soda';
