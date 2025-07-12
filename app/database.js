import { Pool } from 'pg';

const pool = new Pool({
  user: 'admin',
  password: 'password',
  database: 'rinha_db',
  host: process.env.DATABASE_HOST || 'localhost',
  port: 5432,
});

export default pool;
