const axios = require('axios');

const WA_URL = `https://graph.facebook.com/v19.0/${process.env.WA_PHONE_NUMBER_ID}/messages`;

async function sendMessage(to, text) {
  await axios.post(WA_URL, {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: text }
  }, {
    headers: { Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}` }
  });
}

module.exports = { sendMessage };
