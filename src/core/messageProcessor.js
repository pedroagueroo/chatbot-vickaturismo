const { getOrCreateUser }      = require('../models/User');
const { getOrCreateConversation, updateConversationStatus } = require('../models/Conversation');
const { saveMessage }           = require('../models/Message');
const { detectIntent }          = require('./intentDetector');
const { generateResponse }      = require('./responseGenerator');
const { checkEscalation }       = require('./humanEscalation');
const { getSender }             = require('../utils/helpers');
const configService             = require('../services/configService');
const logger                    = require('../utils/logger');

async function processMessage(normalized) {
  const { platform, platform_user_id, text, name, platform_msg_id } = normalized;

  try {
    console.log(`[PROCESSOR] Mensaje recibido de ${platform_user_id}: "${text}"`);
    
    const user = await getOrCreateUser({ platform, platform_user_id, name });
    console.log(`[PROCESSOR] Usuario: ${user.id}`);
    
    const conversation = await getOrCreateConversation({ userId: user.id, platform });
    console.log(`[PROCESSOR] Conversación: ${conversation.id} - Status: ${conversation.status}`);

    if (conversation.status === 'escalated') {
      console.log('[PROCESSOR] Conversación escalada, saltando bot');
      return;
    }

    const savedMsg = await saveMessage({ conversationId: conversation.id, role: 'user', content: text, platform_msg_id });
    console.log(`[PROCESSOR] Mensaje guardado: ${savedMsg?.id}`);

    const config = await configService.getConfig();
    console.log(`[PROCESSOR] Config obtenida: ${config?.agency_name}`);

    if (!configService.isBusinessHours(config)) {
      const sender = getSender(platform);
      await sender.sendMessage(platform_user_id, config.out_of_hours_msg || 'Estamos fuera de nuestro horario de atención.');
      return;
    }

    let intent = await detectIntent(text);
    console.log(`[PROCESSOR] Intención detectada: ${intent}`);
    
    const keywordsEscalation = checkEscalation(text, config.escalation_keywords);
    
    if (keywordsEscalation || intent === 'human_request') {
      await handleEscalation(conversation.id, platform, platform_user_id, config);
      return;
    }

    const response = await generateResponse({ 
      conversationId: conversation.id, 
      userMessage: text, 
      intent, 
      config,
      agentNotes: conversation.agent_notes 
    });
    console.log(`[PROCESSOR] Respuesta generada: "${response.substring(0, 50)}..."`);

    const savedResp = await saveMessage({ conversationId: conversation.id, role: 'assistant', content: response, intent });
    console.log(`[PROCESSOR] Respuesta guardada: ${savedResp?.id}`);
    
    const sender = getSender(platform);
    await sender.sendMessage(platform_user_id, response);

  } catch (err) {
    console.error('[PROCESSOR ERROR]', err.message, err.stack);
  }
}

async function handleEscalation(conversationId, platform, userId, config) {
  await updateConversationStatus(conversationId, 'escalated');
  const sender = getSender(platform);
  await sender.sendMessage(userId, 'Un momento, te estoy conectando con uno de nuestros agentes. 😊 En breve alguien de nuestro equipo te va a atender.');
}

module.exports = { processMessage };
