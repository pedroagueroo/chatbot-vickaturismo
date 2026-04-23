const { pool } = require('../config/database');

async function getConfigFromDB() {
  const query = `SELECT * FROM bot_config LIMIT 1;`;
  const result = await pool.query(query);
  return result.rows[0] || {};
}

module.exports = { getConfig: getConfigFromDB };
