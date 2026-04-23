const express = require('express');
const router = express.Router();
const { validateMetaSignature } = require('./validator');
const { routeWebhook } = require('./router');
const logger = require('../utils/logger');

// Verificación inicial del webhook con Meta
router.get('/', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Recepción de eventos
router.post('/', validateMetaSignature, async (req, res) => {
  // Meta requiere que respondas con 200 INMEDIATAMENTE
  res.sendStatus(200);

  // Procesar de forma asíncrona
  try {
    await routeWebhook(req.body);
  } catch (err) {
    if (logger && logger.error) {
      logger.error('Webhook processing error', { error: err.message });
    } else {
      console.error('Webhook processing error:', err);
    }
  }
});

module.exports = router;
