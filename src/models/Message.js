const { pool } = require('../config/database');

async function saveMessage({ conversationId, role, content, intent = null, platform_msg_id = null }) {
  const query = `
    INSERT INTO messages (conversation_id, role, content, intent, platform_msg_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const result = await pool.query(query, [conversationId, role, content, intent, platform_msg_id]);
  return result.rows[0];
}

async function getHistory(conversationId, limit = 10) {
  const query = `
    SELECT role, content
    FROM (
      SELECT role, content, created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    ) sub
    ORDER BY created_at ASC;
  `;
  const result = await pool.query(query, [conversationId, limit]);
  return result.rows;
}

module.exports = { saveMessage, getHistory };
