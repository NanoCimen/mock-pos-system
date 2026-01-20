import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";

// Determine if we need SSL (typically for cloud databases)
const useSSL = process.env.DATABASE_URL?.includes('amazonaws.com') ||
               process.env.DATABASE_URL?.includes('supabase.co') ||
               process.env.DATABASE_URL?.includes('railway.app') ||
               process.env.USE_SSL === 'true' ||
               process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  console.log("🔄 Creating payment_items table");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      ticket_item_id UUID NOT NULL REFERENCES ticket_items(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("✅ payment_items table created");
  await pool.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
