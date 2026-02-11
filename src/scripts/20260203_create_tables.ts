import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";

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
  console.log("🔄 Creating tables (mesas) table");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tables (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      mesa_id TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      seats INTEGER NOT NULL DEFAULT 4,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("✅ tables table created");
  await pool.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
