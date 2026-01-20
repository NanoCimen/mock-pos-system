-- Create one open ticket
INSERT INTO tickets (
  id, restaurant_id, mesa_id, status, total_amount, currency
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'stripe_test_restaurant',
  'mesa_1',
  'OPEN',
  1500,
  'DOP'
) ON CONFLICT (id) DO NOTHING;

-- Items (IDs auto-generated as UUIDs)
INSERT INTO ticket_items (ticket_id, name, price, quantity)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Burger', 800, 1),
  ('11111111-1111-1111-1111-111111111111', 'Fries', 400, 1),
  ('11111111-1111-1111-1111-111111111111', 'Soda', 300, 1);

-- Create new open ticket with hardcoded ID
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

-- Items for new ticket (total = 1200 + 1000 + 1000 = 3200)
INSERT INTO ticket_items (ticket_id, name, price, quantity)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'Pizza', 1200, 1),
  ('22222222-2222-2222-2222-222222222222', 'Pasta', 1000, 1),
  ('22222222-2222-2222-2222-222222222222', 'Wine', 1000, 1);
