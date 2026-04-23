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
    // 1. Obtener o crear usuario y conversación
    const user = await getOrCreateUser({ platform, platform_user_id, name });
    const conversation = await getOrCreateConversation({ userId: user.id, platform });

    if (conversation.status === 'escalated') {
      logger.info('Conversation escalated, skipping bot', { conversationId: conversation.id });
      return;
    }

    // 2. Guardar mensaje entrante
    await saveMessage({ conversationId: conversation.id, role: 'user', content: text, platform_msg_id });

    // 3. Obtener configuración
    const config = await configService.getConfig();

    // 4. Verificar horario de atención
    if (!configService.isBusinessHours(config)) {
      const sender = getSender(platform);
      await sender.sendMessage(platform_user_id, config.out_of_hours_msg || 'Estamos fuera de nuestro horario de atención.');
      return;
    }

    // 5. Detectar si necesita escalamiento
    let intent = await detectIntent(text);
    const keywordsEscalation = checkEscalation(text, config.escalation_keywords);
    
    if (keywordsEscalation || intent === 'human_request') {
      await handleEscalation(conversation.id, platform, platform_user_id, config);
      return;
    }

    // 6. Generar respuesta con Claude
    const response = await generateResponse({ conversationId: conversation.id, userMessage: text, intent, config });

    // 7. Guardar y enviar respuesta
    await saveMessage({ conversationId: conversation.id, role: 'assistant', content: response, intent });
    const sender = getSender(platform);
    await sender.sendMessage(platform_user_id, response);

  } catch (err) {
    logger.error('Error processing message:', err);
  }
}

async function handleEscalation(conversationId, platform, userId, config) {
  await updateConversationStatus(conversationId, 'escalated');
  const sender = getSender(platform);
  await sender.sendMessage(userId, 'Un momento, te estoy conectando con uno de nuestros agentes. 😊 En breve alguien de nuestro equipo te va a atender.');
}

module.exports = { processMessage };
