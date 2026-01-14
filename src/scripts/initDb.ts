import dotenv from "dotenv";
dotenv.config();

import { pool } from "../db/connection";
import fs from "fs";
import path from "path";

async function init() {
  const schema = fs.readFileSync(
    path.join(__dirname, "../db/schema.sql"),
    "utf8"
  );

  await pool.query(schema);
  console.log("✅ Database schema initialized");
  await pool.end();
  process.exit(0);
}

init().catch((err) => {
  console.error("❌ DB init failed", err);
  process.exit(1);
});
