const axios = require('axios');

const GRAPH_URL = 'https://graph.facebook.com/v19.0/me/messages';

async function sendMessage(recipientId, text) {
  await axios.post(GRAPH_URL, {
    recipient: { id: recipientId },
    message:   { text }
  }, {
    params:  { access_token: process.env.IG_ACCESS_TOKEN },
    headers: { 'Content-Type': 'application/json' }
  });
}

module.exports = { sendMessage };
