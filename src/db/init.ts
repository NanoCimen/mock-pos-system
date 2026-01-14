import pool from './connection.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🗄️  Initializing database...');
    
    // Read and execute schema
    const schemaPath = join(__dirname, 'schema.sql');
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
  }
}

// Run init if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
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