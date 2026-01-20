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
  console.log("🔄 Adding currency column to payments table");
  
  try {
    // Check if column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name = 'currency'
    `);

    if (checkResult.rows.length > 0) {
      console.log("✅ Column 'currency' already exists, skipping");
      await pool.end();
      process.exit(0);
    }

    // Add currency column
    await pool.query(`
      ALTER TABLE payments 
      ADD COLUMN currency TEXT NOT NULL DEFAULT 'DOP'
    `);

    console.log("✅ Migration completed successfully");
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    await pool.end();
    process.exit(1);
  }
}

migrate();
