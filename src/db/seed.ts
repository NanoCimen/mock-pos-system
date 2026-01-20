import dotenv from "dotenv";
dotenv.config();

import { pool } from "./connection";
import fs from "fs";
import path from "path";

async function seed() {
  console.log("🌱 Seeding Railway database...");
  try {
    const seedSQL = fs.readFileSync(
      path.join(__dirname, "seed.sql"),
      "utf8"
    );

    await pool.query(seedSQL);
    console.log("✅ Seed complete");
    // await pool.end(); // Removed to allow subsequent scripts to use the pool
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed", error);
    // await pool.end();
    process.exit(1);
  }
}

seed();
