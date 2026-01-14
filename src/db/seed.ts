import pool from './connection';

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('🌱 Starting database seed...');

    // Insert POS config
    await client.query(`
      INSERT INTO pos_config (name, currency, tax_rate)
      VALUES ('Demo Restaurant', 'DOP', 0.18)
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ POS config created');

    // Clear existing data
    await client.query('DELETE FROM payments');
    await client.query('DELETE FROM ticket_items');
    await client.query('DELETE FROM tickets');
    console.log('🗑️  Cleared existing data');

    // Ticket 1: Open ticket with multiple unpaid items (Table 1)
    await client.query(`
      INSERT INTO tickets (id, table_id, status, currency, subtotal, tax, total, opened_at, created_at, updated_at)
      VALUES ('ticket_open_1', 'table_1', 'open', 'DOP', 1850.00, 333.00, 2183.00, NOW() - INTERVAL '30 minutes', NOW(), NOW())
    `);
    
    await client.query(`
      INSERT INTO ticket_items (id, ticket_id, name, unit_price, quantity, paid_quantity, status, created_at, updated_at)
      VALUES
        ('item_1_1', 'ticket_open_1', 'Caesar Salad', 350.00, 2, 0, 'unpaid', NOW(), NOW()),
        ('item_1_2', 'ticket_open_1', 'Grilled Salmon', 750.00, 1, 0, 'unpaid', NOW(), NOW()),
        ('item_1_3', 'ticket_open_1', 'Ribeye Steak', 950.00, 1, 0, 'unpaid', NOW(), NOW()),
        ('item_1_4', 'ticket_open_1', 'Red Wine Glass', 250.00, 2, 0, 'unpaid', NOW(), NOW())
    `);
    console.log('✅ Ticket 1: Open with 4 unpaid items (Table 1)');

    // Ticket 2: Open ticket with different items (Table 2)
    await client.query(`
      INSERT INTO tickets (id, table_id, status, currency, subtotal, tax, total, opened_at, created_at, updated_at)
      VALUES ('ticket_open_2', 'table_2', 'open', 'DOP', 2450.00, 441.00, 2891.00, NOW() - INTERVAL '45 minutes', NOW(), NOW())
    `);
    
    await client.query(`
      INSERT INTO ticket_items (id, ticket_id, name, unit_price, quantity, paid_quantity, status, created_at, updated_at)
      VALUES
        ('item_2_1', 'ticket_open_2', 'Lobster Bisque', 450.00, 2, 0, 'unpaid', NOW(), NOW()),
        ('item_2_2', 'ticket_open_2', 'Filet Mignon', 1200.00, 1, 0, 'unpaid', NOW(), NOW()),
        ('item_2_3', 'ticket_open_2', 'Truffle Pasta', 800.00, 1, 0, 'unpaid', NOW(), NOW()),
        ('item_2_4', 'ticket_open_2', 'Chocolate Lava Cake', 350.00, 2, 0, 'unpaid', NOW(), NOW()),
        ('item_2_5', 'ticket_open_2', 'Espresso', 150.00, 2, 0, 'unpaid', NOW(), NOW())
    `);
    console.log('✅ Ticket 2: Open with 5 unpaid items (Table 2)');

    // Ticket 3: Open ticket (Table 3)
    await client.query(`
      INSERT INTO tickets (id, table_id, status, currency, subtotal, tax, total, opened_at, created_at, updated_at)
      VALUES ('ticket_open_3', 'table_3', 'open', 'DOP', 1900.00, 342.00, 2242.00, NOW() - INTERVAL '20 minutes', NOW(), NOW())
    `);
    
    await client.query(`
      INSERT INTO ticket_items (id, ticket_id, name, unit_price, quantity, paid_quantity, status, created_at, updated_at)
      VALUES
        ('item_3_1', 'ticket_open_3', 'Margherita Pizza', 550.00, 1, 0, 'unpaid', NOW(), NOW()),
        ('item_3_2', 'ticket_open_3', 'Greek Salad', 300.00, 1, 0, 'unpaid', NOW(), NOW()),
        ('item_3_3', 'ticket_open_3', 'BBQ Ribs', 850.00, 1, 0, 'unpaid', NOW(), NOW()),
        ('item_3_4', 'ticket_open_3', 'IPA Beer', 200.00, 1, 0, 'unpaid', NOW(), NOW())
    `);
    console.log('✅ Ticket 3: Open with 4 unpaid items (Table 3)');

    // Ticket 4: Partially paid ticket (Table 4)
    await client.query(`
      INSERT INTO tickets (id, table_id, status, currency, subtotal, tax, total, opened_at, created_at, updated_at)
      VALUES ('ticket_partial_1', 'table_4', 'partially_paid', 'DOP', 3200.00, 576.00, 3776.00, NOW() - INTERVAL '1 hour', NOW(), NOW())
    `);
    
    await client.query(`
      INSERT INTO ticket_items (id, ticket_id, name, unit_price, quantity, paid_quantity, status, created_at, updated_at)
      VALUES
        ('item_4_1', 'ticket_partial_1', 'Appetizer Platter', 600.00, 1, 1, 'paid', NOW(), NOW()),
        ('item_4_2', 'ticket_partial_1', 'Sushi Combo', 950.00, 2, 1, 'partially_paid', NOW(), NOW()),
        ('item_4_3', 'ticket_partial_1', 'Wagyu Burger', 850.00, 2, 0, 'unpaid', NOW(), NOW()),
        ('item_4_4', 'ticket_partial_1', 'French Fries', 200.00, 3, 2, 'partially_paid', NOW(), NOW()),
        ('item_4_5', 'ticket_partial_1', 'Mojito', 300.00, 2, 1, 'partially_paid', NOW(), NOW()),
        ('item_4_6', 'ticket_partial_1', 'Tiramisu', 400.00, 2, 0, 'unpaid', NOW(), NOW())
    `);

    // Add payment records for partially paid ticket
    await client.query(`
      INSERT INTO payments (id, ticket_id, amount, method, external_provider, external_payment_id, status, items, created_at, updated_at)
      VALUES
        ('payment_1', 'ticket_partial_1', 600.00, 'card', 'YAP', 'yap_pay_abc123', 'confirmed', 
         '[{"itemId": "item_4_1", "quantity": 1}]', NOW() - INTERVAL '30 minutes', NOW()),
        ('payment_2', 'ticket_partial_1', 1350.00, 'card', 'YAP', 'yap_pay_def456', 'confirmed',
         '[{"itemId": "item_4_2", "quantity": 1}, {"itemId": "item_4_4", "quantity": 2}, {"itemId": "item_4_5", "quantity": 1}]', NOW() - INTERVAL '15 minutes', NOW())
    `);
    console.log('✅ Ticket 4: Partially paid with 6 items (Table 4)');

    // Ticket 5: Fully paid ticket (Table 5)
    await client.query(`
      INSERT INTO tickets (id, table_id, status, currency, subtotal, tax, total, opened_at, closed_at, created_at, updated_at)
      VALUES ('ticket_paid_1', 'table_5', 'paid', 'DOP', 1400.00, 252.00, 1652.00, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes', NOW(), NOW())
    `);
    
    await client.query(`
      INSERT INTO ticket_items (id, ticket_id, name, unit_price, quantity, paid_quantity, status, created_at, updated_at)
      VALUES
        ('item_5_1', 'ticket_paid_1', 'Club Sandwich', 450.00, 2, 2, 'paid', NOW(), NOW()),
        ('item_5_2', 'ticket_paid_1', 'Tomato Soup', 250.00, 2, 2, 'paid', NOW(), NOW()),
        ('item_5_3', 'ticket_paid_1', 'Iced Tea', 100.00, 4, 4, 'paid', NOW(), NOW())
    `);

    await client.query(`
      INSERT INTO payments (id, ticket_id, amount, method, external_provider, external_payment_id, status, items, created_at, updated_at)
      VALUES
        ('payment_3', 'ticket_paid_1', 1652.00, 'cash', 'YAP', 'yap_pay_ghi789', 'confirmed',
         '[{"itemId": "item_5_1", "quantity": 2}, {"itemId": "item_5_2", "quantity": 2}, {"itemId": "item_5_3", "quantity": 4}]', NOW() - INTERVAL '30 minutes', NOW())
    `);
    console.log('✅ Ticket 5: Fully paid with 3 items (Table 5)');

    await client.query('COMMIT');
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - 3 open tickets');
    console.log('  - 1 partially paid ticket');
    console.log('  - 1 fully paid ticket');
    console.log('  - Total: 21 items across all tickets');
    console.log('  - 3 payment records\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run seed if called directly
seed()
  .then(async () => {
    console.log('✅ Seed completed');
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ Seed failed:', error);
    await pool.end();
    process.exit(1);
  });

export default seed;
