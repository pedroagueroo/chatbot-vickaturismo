const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { authenticateToken } = require('./middleware/auth');
const { pool } = require('../config/database');
const configService = require('../services/configService');
const { getConversations, updateAgentNotes, updateConversationStatus } = require('../models/Conversation');

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token });
  }
  res.status(401).json({ error: 'Credenciales inválidas' });
});

// Obtener configuración del bot
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const config = await configService.getConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar configuración
router.put('/config', authenticateToken, async (req, res) => {
  try {
    const { agency_name, welcome_msg, out_of_hours_msg, business_hours, contact_info, bot_personality, escalation_keywords } = req.body;
    
    // Primero vemos si ya existe un registro (asumimos 1 sola fila)
    const check = await pool.query('SELECT id FROM bot_config LIMIT 1');
    if (check.rows.length === 0) {
      await pool.query(
        `INSERT INTO bot_config (agency_name, welcome_msg, out_of_hours_msg, business_hours, contact_info, bot_personality, escalation_keywords) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [agency_name, welcome_msg, out_of_hours_msg, business_hours, contact_info, bot_personality, escalation_keywords]
      );
    } else {
      await pool.query(
        `UPDATE bot_config SET 
          agency_name = $1, welcome_msg = $2, out_of_hours_msg = $3, business_hours = $4, 
          contact_info = $5, bot_personality = $6, escalation_keywords = $7, updated_at = NOW()`,
        [agency_name, welcome_msg, out_of_hours_msg, business_hours, contact_info, bot_personality, escalation_keywords]
      );
    }
    
    configService.invalidateCache();
    res.json({ message: 'Configuración actualizada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar conversaciones
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const list = await getConversations();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ver mensajes de una conversación
router.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC', [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar notas del agente
router.put('/conversations/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const updated = await updateAgentNotes(id, notes);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cambiar estado de la conversación
router.put('/conversations/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await updateConversationStatus(id, status);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
