import dotenv from "dotenv";
dotenv.config();

import { pool } from "../db/connection";
import fs from "fs";
import path from "path";

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set in environment");
    process.exit(1);
  }

  console.log("📡 Connecting to database...");
  const seedSQL = fs.readFileSync(
    path.join(__dirname, "../db/seed.sql"),
    "utf8"
  );

  await pool.query(seedSQL);
  console.log("✅ Seed complete");
  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed", err);
  process.exit(1);
});
