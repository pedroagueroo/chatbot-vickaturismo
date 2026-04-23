const whatsappHandler = require('../channels/whatsapp/handler');
const messengerHandler = require('../channels/messenger/handler');
const instagramHandler = require('../channels/instagram/handler');
const logger = require('../utils/logger');

async function routeWebhook(body) {
  const { object, entry } = body;

  // WhatsApp
  if (object === 'whatsapp_business_account') {
    return whatsappHandler.handle(entry);
  }

  // Instagram y Messenger
  if (object === 'instagram') {
    return instagramHandler.handle(entry);
  }

  if (object === 'page') {
    return messengerHandler.handle(entry);
  }

  if (logger && logger.warn) {
    logger.warn('Unknown webhook object', { object });
  } else {
    console.warn('Unknown webhook object:', object);
  }
}

module.exports = { routeWebhook };
