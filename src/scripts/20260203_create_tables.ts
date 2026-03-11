/**
 * Ensures the `tables` table exists in Postgres (e.g. Railway).
 * Safe to run multiple times: CREATE TABLE IF NOT EXISTS, seed uses ON CONFLICT DO NOTHING.
 *
 * Run against Railway: set DATABASE_URL or DATABASE_PUBLIC_URL then:
 *   npx tsx src/scripts/20260203_create_tables.ts
 * Or: npm run db:migrate:tables
 */
import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";

// Same connection logic as POS API (Railway Postgres)
const connectionString =
  process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

const isRailway =
  process.env.DATABASE_URL?.includes("railway.app") ||
  process.env.DATABASE_PUBLIC_URL?.includes("railway.app") ||
  process.env.RAILWAY_ENVIRONMENT === "true";
const isCloudDb =
  process.env.DATABASE_URL?.includes("amazonaws.com") ||
  process.env.DATABASE_URL?.includes("supabase.co") ||
  isRailway ||
  process.env.USE_SSL === "true" ||
  process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  console.log("🔄 Ensuring tables (mesas) table exists...");

  await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tables (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      mesa_id TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      seats INTEGER NOT NULL DEFAULT 4,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    INSERT INTO tables (mesa_id, label, seats) VALUES
      ('mesa_1', 'Table 1', 4),
      ('mesa_2', 'Table 2', 4)
    ON CONFLICT (mesa_id) DO NOTHING
  `);

  console.log("✅ tables table verified/created successfully");
  await pool.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
