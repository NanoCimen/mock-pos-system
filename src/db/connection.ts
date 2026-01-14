import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Determine if we need SSL (typically for cloud databases)
const useSSL = process.env.DATABASE_URL?.includes('amazonaws.com') || 
               process.env.DATABASE_URL?.includes('supabase.co') ||
               process.env.USE_SSL === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err: Error) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;

