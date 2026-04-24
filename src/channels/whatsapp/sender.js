const axios = require('axios');

const WA_URL = `https://graph.facebook.com/v19.0/${process.env.WA_PHONE_NUMBER_ID}/messages`;

async function sendMessage(to, text) {
  try {
    // Argentina: 5492XXXXXXXXXX → 542XX15XXXXXXX
    if (to.startsWith('549') && to.length === 13) {
      const area = to.slice(3, 6);   // 223
      const num = to.slice(6);        // 4233487
      to = '54' + area + '15' + num; // 54223154233487
    }

    console.log(`[WHATSAPP SENDER] Intentando enviar mensaje a: ${to}`);
    await axios.post(WA_URL, {
      messaging_product: 'whatsapp',
      recipient_type:    'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: text }
    }, {
      headers: { Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}` }
    });
    console.log(`[WHATSAPP SENDER] Mensaje enviado exitosamente a: ${to}`);
  } catch (error) {
    console.error(`[WHATSAPP SENDER ERROR] Falló el envío a ${to}. Detalles de Meta:`, error.response?.data || error.message);
    throw error;
  }
}

module.exports = { sendMessage };
