const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  if (logger && logger.error) {
    logger.error('Unexpected error on idle client', err);
  } else {
    console.error('Unexpected error on idle client', err);
  }
  process.exit(-1);
});

async function connectDB() {
  try {
    const client = await pool.connect();
    if (logger && logger.info) {
      logger.info('Connected to PostgreSQL successfully');
    } else {
      console.log('Connected to PostgreSQL successfully');
    }
    client.release();
  } catch (err) {
    if (logger && logger.error) {
      logger.error('Database connection failed', err);
    } else {
      console.error('Database connection failed', err);
    }
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
}

module.exports = { pool, connectDB };
