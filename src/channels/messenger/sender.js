const axios = require('axios');

const GRAPH_URL = 'https://graph.facebook.com/v19.0/me/messages';

async function sendMessage(recipientId, text) {
  await axios.post(GRAPH_URL, {
    recipient: { id: recipientId },
    message:   { text },
    messaging_type: 'RESPONSE'
  }, {
    params:  { access_token: process.env.FB_PAGE_ACCESS_TOKEN },
    headers: { 'Content-Type': 'application/json' }
  });
}

module.exports = { sendMessage };
