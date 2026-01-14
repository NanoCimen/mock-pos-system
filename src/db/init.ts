import pool from './connection';
import { readFileSync } from 'fs';
import path from 'path';

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🗄️  Initializing database...');
    
    // Read and execute schema - use path relative to current file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    
    await client.query(schema);
    console.log('✅ Database schema created');
    
    // Insert default POS config
    await client.query(`
      INSERT INTO pos_config (name, currency, tax_rate)
      VALUES ('Demo Restaurant', 'DOP', 0.18)
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ POS config initialized');
    
    console.log('🎉 Database initialization completed!');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run init if called directly
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('✅ Init completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Init failed:', error);
      process.exit(1);
    });
}

export default initDatabase;
