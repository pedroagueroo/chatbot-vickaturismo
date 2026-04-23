const { processMessage } = require('../../core/messageProcessor');
const logger = require('../../utils/logger');

async function handle(entries) {
  for (const entry of entries) {
    for (const messaging of entry.messaging ?? []) {
      if (!messaging.message || !messaging.message.text) continue;

      const normalized = {
        platform: 'instagram',
        platform_user_id: messaging.sender.id,
        platform_msg_id: messaging.message.mid,
        text: messaging.message.text,
        name: 'Usuario IG' // Mismo caso que FB, simplificado
      };

      await processMessage(normalized);
    }
  }
}

module.exports = { handle };
