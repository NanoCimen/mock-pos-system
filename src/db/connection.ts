import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Prefer internal DB URL when on Railway (avoids public TLS issues); use public for local scripts
const connectionString =
  process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

const isRailway =
  process.env.DATABASE_URL?.includes('railway.app') ||
  process.env.DATABASE_PUBLIC_URL?.includes('railway.app') ||
  process.env.RAILWAY_ENVIRONMENT === 'true';
const isCloudDb =
  process.env.DATABASE_URL?.includes('amazonaws.com') ||
  process.env.DATABASE_URL?.includes('supabase.co') ||
  isRailway ||
  process.env.USE_SSL === 'true' ||
  process.env.NODE_ENV === 'production';

// Railway Postgres: use rejectUnauthorized: false for self-signed certs; Node pg uses TLS 1.2+
const ssl = isCloudDb ? { rejectUnauthorized: false } : false;

export const pool = new Pool({
  connectionString,
  ssl,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

// Log but do not exit on idle client errors (allows reconnects; SIGTERM is handled in index)
pool.on('error', (err: Error) => {
  console.error('❌ PostgreSQL pool error (idle client):', err.message);
});

export default pool;
