function getSender(platform) {
  if (platform === 'whatsapp') return require('../channels/whatsapp/sender');
  if (platform === 'messenger') return require('../channels/messenger/sender');
  if (platform === 'instagram') return require('../channels/instagram/sender');
  throw new Error(`Unknown platform: ${platform}`);
}

module.exports = { getSender };
