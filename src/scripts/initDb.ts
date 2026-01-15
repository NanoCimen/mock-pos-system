import dotenv from "dotenv";
dotenv.config();

import { pool } from "../db/connection";
import fs from "fs";
import path from "path";

async function init() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set in environment");
    process.exit(1);
  }

  console.log("📡 Connecting to database...");
  const schema = fs.readFileSync(
    path.join(__dirname, "../db/schema.sql"),
    "utf8"
  );

  await pool.query(schema);
  console.log("✅ Schema applied");
  await pool.end();
  process.exit(0);
}

init().catch((err) => {
  console.error("❌ Failed to apply schema", err);
  process.exit(1);
});
