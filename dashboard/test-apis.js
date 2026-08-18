
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function testAnthropic(apiKey) {
  console.log('\n--- Probando Anthropic (Claude) ---');
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hola' }]
      })
    });
    const data = await res.json();
    if (res.ok) {
      console.log('✅ Anthropic funciona perfecto. Respuesta:', data.content[0].text);
    } else {
      console.error('❌ Error en Anthropic:', data);
    }
  } catch (err) {
    console.error('❌ Error de conexión con Anthropic:', err.message);
  }
}

async function testMeta(token, phoneId, recipientPhone) {
  console.log('\n--- Probando Meta (WhatsApp) ---');
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'text',
        text: { body: 'Prueba manual de API exitosa' }
      })
    });
    const data = await res.json();
    if (res.ok) {
      console.log('✅ Meta funciona perfecto. Mensaje enviado a', recipientPhone);
    } else {
      console.error('❌ Error en Meta:', data);
    }
  } catch (err) {
    console.error('❌ Error de conexión con Meta:', err.message);
  }
}

async function run() {
  console.log('=== TEST DE APIS (Diagnóstico) ===\n');
  const anthropicKey = await askQuestion('1. Pegá tu API Key de Anthropic (sk-ant...): ');
  
  if (anthropicKey.trim()) {
    await testAnthropic(anthropicKey.trim());
  }

  const metaToken = await askQuestion('\n2. Pegá tu Token Temporal de Meta (EAAY...): ');
  const phoneId = await askQuestion('3. Pegá tu Phone Number ID de Meta (Ej: 114014...): ');
  const recipient = await askQuestion('4. Pegá el número al que le querés escribir (Ej: 5492234233487): ');

  if (metaToken.trim() && phoneId.trim() && recipient.trim()) {
    await testMeta(metaToken.trim(), phoneId.trim(), recipient.trim());
  }

  rl.close();
}

run();
