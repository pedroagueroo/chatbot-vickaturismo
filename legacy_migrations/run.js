require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');
    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      console.log(`Executing ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
    }
    console.log('All migrations executed successfully.');
  } catch (err) {
    console.error('Error running migrations:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runMigrations();
