const { pool } = require('../config/database');

async function getOrCreateUser({ platform, platform_user_id, name }) {
  const query = `
    INSERT INTO users (platform, platform_id, name)
    VALUES ($1, $2, $3)
    ON CONFLICT (platform, platform_id) DO UPDATE SET
      name = EXCLUDED.name,
      updated_at = NOW()
    RETURNING *;
  `;
  const result = await pool.query(query, [platform, platform_user_id, name]);
  return result.rows[0];
}

module.exports = { getOrCreateUser };
