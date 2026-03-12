/**
 * Creates mesa_close_logs table for "close mesa" history.
 * Run: npx tsx src/scripts/20260312_create_mesa_close_logs.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
const isCloudDb =
  process.env.DATABASE_URL?.includes("railway.app") ||
  process.env.DATABASE_PUBLIC_URL?.includes("railway.app") ||
  process.env.USE_SSL === "true" ||
  process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mesa_close_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      mesa_id TEXT NOT NULL,
      ticket_id UUID NOT NULL,
      total_amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'DOP',
      items_summary JSONB NOT NULL DEFAULT '[]',
      closed_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ mesa_close_logs table verified/created");
  await pool.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
