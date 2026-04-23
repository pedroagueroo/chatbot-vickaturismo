const { pool } = require('../config/database');

async function getFAQsFormatted() {
  const query = `SELECT question, answer FROM faqs WHERE is_active = TRUE;`;
  const result = await pool.query(query);
  return result.rows.map(f => `P: ${f.question}\nR: ${f.answer}`).join('\n\n');
}

module.exports = { getFAQsFormatted };
