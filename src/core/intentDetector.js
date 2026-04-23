const { callClaude } = require('../services/claudeService');

const INTENTS = ['general', 'quote', 'availability', 'complaint', 'human_request'];

async function detectIntent(text) {
  try {
    const response = await callClaude({
      systemPrompt: `
Clasificá el siguiente mensaje de un cliente de una agencia de viajes en UNA de estas categorías:
- general: consulta general sobre destinos, info, precios aproximados
- quote: solicita presupuesto concreto o cotización
- availability: consulta disponibilidad para fechas específicas
- complaint: reclamo, queja o insatisfacción
- human_request: quiere hablar con una persona

Respondé SOLO con la categoría, sin explicación ni puntuación extra.`,
      messages: [{ role: 'user', content: text }],
      maxTokens: 10
    });

    const detected = response.trim().toLowerCase();
    return INTENTS.includes(detected) ? detected : 'general';
  } catch (err) {
    console.error('Error detectando intención:', err);
    return 'general';
  }
}

module.exports = { detectIntent };
