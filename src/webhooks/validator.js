const crypto = require('crypto');
const logger = require('../utils/logger');

function validateMetaSignature(req, res, next) {
  // En desarrollo (o si falta el APP_SECRET), podemos saltar la validación si es necesario, 
  // pero lo ideal es tenerla activa
  if (process.env.NODE_ENV === 'development' && !process.env.META_APP_SECRET) {
    return next();
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    logger.warn('Webhook bloqueado: Falta la firma x-hub-signature-256');
    return res.sendStatus(403);
  }

  const elements = signature.split('=');
  const signatureHash = elements[1];
  const expectedHash = crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(req.rawBody) // usar el buffer crudo!
    .digest('hex');

  if (signatureHash !== expectedHash) {
    logger.warn('Webhook bloqueado: La firma HMAC no coincide');
    return res.sendStatus(403);
  }

  next();
}

module.exports = { validateMetaSignature };
