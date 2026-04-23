async function callClaude({ systemPrompt, messages, maxTokens = 600 }) {
  const lastMessage = messages[messages.length - 1]?.content || '';
  console.log('[MODO SIMULADO] Mensaje recibido:', lastMessage);
  return 'Hola! Soy el asistente virtual de Vicka Turismo 🌍 Estamos en modo de prueba. Pronto voy a poder responderte con toda la info sobre nuestros paquetes. ¿En qué puedo ayudarte?';
}

module.exports = { callClaude };
