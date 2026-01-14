import dotenv from "dotenv";
dotenv.config();

import { pool } from "../db/connection";

async function seed() {
  await pool.query(`
    INSERT INTO tickets (id, status, total_amount)
    VALUES ('TCK_1', 'OPEN', 2800)
    ON CONFLICT DO NOTHING
  `);

  await pool.query(`
    INSERT INTO ticket_items (id, ticket_id, name, price)
    VALUES
      ('itm_1', 'TCK_1', 'Burger', 1200),
      ('itm_2', 'TCK_1', 'Beer', 800),
      ('itm_3', 'TCK_1', 'Fries', 800)
    ON CONFLICT DO NOTHING
  `);

  console.log("✅ Seed data inserted");
  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed", err);
  process.exit(1);
});
