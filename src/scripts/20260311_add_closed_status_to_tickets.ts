/**
 * Add CLOSED to tickets.status so paid tickets can be closed.
 * Run: npx tsx src/scripts/20260311_add_closed_status_to_tickets.ts
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
  const nameResult = await pool.query(`
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'tickets' AND constraint_type = 'CHECK'
    LIMIT 1
  `);
  const constraintName = nameResult.rows[0]?.constraint_name;
  if (constraintName) {
    await pool.query(`ALTER TABLE tickets DROP CONSTRAINT "${constraintName}"`);
  }
  await pool.query(`
    ALTER TABLE tickets
    ADD CONSTRAINT tickets_status_check
    CHECK (status IN ('OPEN', 'PARTIALLY_PAID', 'PAID', 'CLOSED'));
  `);
  console.log("✅ tickets.status now allows CLOSED");
  await pool.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
