import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";

// Use Railway public database URL
const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function verifyTicket() {
  const ticketId = '22222222-2222-2222-2222-222222222222';
  
  console.log(`🔍 Verifying ticket ${ticketId} in Railway database...`);
  
  try {
    // Check if ticket exists
    const ticketResult = await pool.query(
      'SELECT * FROM tickets WHERE tickets.id = $1',
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      console.error(`❌ Ticket ${ticketId} NOT FOUND in Railway database`);
      console.log('💡 Run: npm run db:seed (with DATABASE_PUBLIC_URL set)');
      process.exit(1);
    }

    const ticket = ticketResult.rows[0];
    console.log(`✅ Ticket found:`);
    console.log(`   ID: ${ticket.id}`);
    console.log(`   Status: ${ticket.status}`);
    console.log(`   Total: ${ticket.total_amount} DOP`);
    console.log(`   Currency: ${ticket.currency}`);

    // Check items
    const itemsResult = await pool.query(
      'SELECT * FROM ticket_items WHERE ticket_items.ticket_id = $1',
      [ticketId]
    );

    console.log(`   Items: ${itemsResult.rows.length}`);
    itemsResult.rows.forEach((item: any) => {
      console.log(`     - ${item.name}: ${item.price} x ${item.quantity} (paid: ${item.paid_amount || 0})`);
    });

    console.log(`\n✅ Ticket ${ticketId} is ready in Railway database!`);
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error verifying ticket:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyTicket();
