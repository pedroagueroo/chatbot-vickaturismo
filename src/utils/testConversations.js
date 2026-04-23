const { processMessage } = require('../core/messageProcessor');

async function runTests() {
  console.log('--- Test 1: Consulta de paquete (Intención: Quote/General) ---');
  await processMessage({
    platform: 'whatsapp',
    platform_user_id: '5491112345678',
    platform_msg_id: 'msg_1',
    text: 'Hola, me gustaría saber cuánto cuesta un paquete a Río de Janeiro para febrero.',
    name: 'Juan Perez'
  });

  setTimeout(async () => {
    console.log('\n--- Test 2: Escalamiento (Intención: Human Request) ---');
    await processMessage({
      platform: 'whatsapp',
      platform_user_id: '5491112345678',
      platform_msg_id: 'msg_2',
      text: 'Quiero hablar con una persona, no entiendo lo de los vuelos.',
      name: 'Juan Perez'
    });
  }, 10000);
}

// Descomentar para correr manualmente
// require('dotenv').config();
// require('../config/database').connectDB().then(runTests);

module.exports = { runTests };
