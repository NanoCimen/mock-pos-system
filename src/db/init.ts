import pool from './connection';
import fs from 'fs';
import path from 'path';

async function initDatabase() {
  try {
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf-8'
    );
    await pool.query(schemaSQL);
    console.log('✅ Database schema created successfully');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating database schema:', error);
    await pool.end();
    process.exit(1);
  }
}

initDatabase();

