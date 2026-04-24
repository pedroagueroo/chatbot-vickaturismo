const { pool } = require('../config/database');

async function getOrCreateConversation({ userId, platform }) {
  // Buscar conversación activa
  let query = `
    SELECT * FROM conversations
    WHERE user_id = $1 AND platform = $2 AND status != 'closed'
    ORDER BY created_at DESC LIMIT 1;
  `;
  let result = await pool.query(query, [userId, platform]);
  
  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // Crear nueva si no hay activa
  query = `
    INSERT INTO conversations (user_id, platform)
    VALUES ($1, $2)
    RETURNING *;
  `;
  result = await pool.query(query, [userId, platform]);
  return result.rows[0];
}

async function updateConversationStatus(conversationId, status) {
  const query = `
    UPDATE conversations SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;
  const result = await pool.query(query, [status, conversationId]);
  return result.rows[0];
}

async function updateAgentNotes(conversationId, notes) {
  const query = `
    UPDATE conversations SET agent_notes = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;
  const result = await pool.query(query, [notes, conversationId]);
  return result.rows[0];
}

async function getConversations() {
  const query = `
    SELECT c.*, u.name as user_name, u.platform_id as platform_user_id 
    FROM conversations c
    JOIN users u ON c.user_id = u.id
    ORDER BY c.updated_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

module.exports = { getOrCreateConversation, updateConversationStatus, updateAgentNotes, getConversations };
