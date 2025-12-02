// backend/db.js
// Postgres connection using DATABASE_URL (Render, Railway, etc.)
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("ERROR: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

// If the host requires SSL but has a self-signed cert (common on some hosts),
// set PGSSLMODE to "no-verify" or use the ssl config below.
// Render provides a standard DATABASE_URL that works with this ssl config.
const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  // optional config:
  // max: 10,
  // idleTimeoutMillis: 30000,
  // connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
  // do not exit here; decide per-app policies
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool // expose pool if you need transactions
};
