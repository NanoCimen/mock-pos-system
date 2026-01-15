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

-- Items
INSERT INTO ticket_items (ticket_id, name, price, quantity)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Burger', 800, 1),
  ('11111111-1111-1111-1111-111111111111', 'Fries', 400, 1),
  ('11111111-1111-1111-1111-111111111111', 'Soda', 300, 1)
ON CONFLICT (id) DO NOTHING;
