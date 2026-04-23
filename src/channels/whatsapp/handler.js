const { processMessage } = require('../../core/messageProcessor');
const logger = require('../../utils/logger');

async function handle(entries) {
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages) continue;

      for (const message of value.messages) {
        if (message.type !== 'text') continue; // Por ahora solo texto

        const normalized = {
          platform:       'whatsapp',
          platform_user_id: message.from,
          platform_msg_id:  message.id,
          text:           message.text.body,
          name:           value.contacts?.[0]?.profile?.name ?? 'Usuario'
        };

        await processMessage(normalized);
      }
    }
  }
}

module.exports = { handle };
