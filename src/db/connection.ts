import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Determine if we need SSL (typically for cloud databases)
const useSSL = process.env.DATABASE_URL?.includes('amazonaws.com') ||
               process.env.DATABASE_URL?.includes('supabase.co') ||
               process.env.DATABASE_URL?.includes('railway.app') ||
               process.env.DATABASE_PUBLIC_URL?.includes('railway.app') ||
               process.env.USE_SSL === 'true' ||
               process.env.NODE_ENV === 'production';

export const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
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
