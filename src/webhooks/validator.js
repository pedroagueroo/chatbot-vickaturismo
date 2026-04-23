const crypto = require('crypto');

function validateMetaSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return res.sendStatus(401);

  // Meta sends signature with 'sha256=' prefix
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.sendStatus(401);
  }
  next();
}

module.exports = { validateMetaSignature };
