import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log("🔄 Starting migration: add external_provider to payments");
  
  try {
    // Check if column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name = 'external_provider'
    `);

    if (checkResult.rows.length > 0) {
      console.log("✅ Column 'external_provider' already exists, skipping");
      await pool.end();
      process.exit(0);
    }

    // Add external_provider column
    await pool.query(`
      ALTER TABLE payments 
      ADD COLUMN external_provider TEXT
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
