import pool from './connection';
import fs from 'fs';
import path from 'path';

export async function initializeDatabase() {
  try {
    // Check if tables already exist
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'restaurants'
      );
    `);
    
    if (checkResult.rows[0].exists) {
      console.log('✅ Database tables already exist');
      return;
    }

    // Create tables if they don't exist
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf-8'
    );
    await pool.query(schemaSQL);
    console.log('✅ Database schema created successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// Standalone execution for db:init script
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

// Only run if this file is executed directly (not imported)
if (require.main === module) {
  initDatabase();
}
