const { callClaude }          = require('../services/claudeService');
const { getHistory }          = require('../models/Message');
const { getFAQsFormatted }    = require('../models/FAQ');

async function generateResponse({ conversationId, userMessage, intent, config }) {
  // Obtener historial reciente (últimos 10 mensajes)
  const history = await getHistory(conversationId, 10);
  
  // Obtener FAQs activas
  const faqs = await getFAQsFormatted();

  const systemPrompt = buildSystemPrompt(config, faqs, intent);

  // Formatear historial
  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  return await callClaude({ systemPrompt, messages });
}

function buildSystemPrompt(config, faqs, intent) {
  return `
Sos el asistente virtual de ${config.agency_name}, una agencia de viajes especializada en turismo.

PERSONALIDAD:
${config.bot_personality || 'Amigable, profesional y orientado a ventas. Siempre empáticos y entusiastas con los destinos.'}

TU OBJETIVO:
- Ayudar a los clientes a encontrar el paquete turístico ideal
- Responder preguntas sobre destinos, precios y disponibilidad
- Capturar leads interesados para que un agente los contacte
- Derivar al agente humano cuando corresponda

INFORMACIÓN DE CONTACTO:
${JSON.stringify(config.contact_info || {})}

PREGUNTAS FRECUENTES Y PRODUCTOS:
${faqs}

REGLAS ESTRICTAS:
- Si no sabés el precio exacto, decí que vas a consultar y ofrecé contacto con el agente
- No inventes precios ni disponibilidades
- Siempre terminá con una llamada a la acción (¿querés que un agente te contacte? etc.)
- Respondé siempre en español
- Máximo 3 párrafos cortos por respuesta
- Usá emojis con moderación

INTENCIÓN DETECTADA DEL USUARIO: ${intent}
  `.trim();
}

module.exports = { generateResponse };
