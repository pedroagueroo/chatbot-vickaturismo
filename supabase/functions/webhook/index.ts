// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

// Helper para responder rápido a Meta y evitar timeouts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cliente de Supabase (usamos el Service Role para saltarnos RLS internamente)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Cliente de Anthropic
const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY') || '',
});

// Google Speech-to-Text (transcripción de audios de WhatsApp)
const GOOGLE_STT_API_KEY = Deno.env.get('GOOGLE_STT_API_KEY') || '';
// Dejamos margen bajo el free tier de Google (60 min/mes) para evitar cargos inesperados
const MONTHLY_AUDIO_LIMIT_SECONDS = 55 * 60;

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

async function getMonthlySttUsage(): Promise<number> {
  const { data } = await supabase
    .from('stt_usage')
    .select('seconds_used')
    .eq('year_month', currentYearMonth())
    .single();
  return data?.seconds_used || 0;
}

async function addMonthlySttUsage(seconds: number) {
  const ym = currentYearMonth();
  const { data: existing } = await supabase
    .from('stt_usage')
    .select('seconds_used')
    .eq('year_month', ym)
    .single();

  if (existing) {
    await supabase
      .from('stt_usage')
      .update({ seconds_used: existing.seconds_used + seconds, updated_at: new Date().toISOString() })
      .eq('year_month', ym);
  } else {
    await supabase.from('stt_usage').insert({ year_month: ym, seconds_used: seconds });
  }
}

function sttEncodingFor(mimeType: string): string | null {
  if (mimeType.includes('ogg')) return 'OGG_OPUS';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'MP3';
  if (mimeType.includes('amr')) return 'AMR';
  return null; // aac/m4a u otros formatos no soportados por la API de Google en modo síncrono
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Descarga el audio desde Meta y lo transcribe con Google Speech-to-Text.
// Devuelve null si no se puede transcribir (formato no soportado, error, o límite mensual alcanzado),
// en cuyo caso el llamador debe pedirle al usuario que escriba.
async function transcribeWhatsappAudio(mediaId: string, whatsappToken: string): Promise<string | null> {
  if (!GOOGLE_STT_API_KEY) {
    console.error('Falta configurar GOOGLE_STT_API_KEY');
    return null;
  }

  const mediaInfoRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
    headers: { 'Authorization': `Bearer ${whatsappToken}` },
  });
  const mediaInfo = await mediaInfoRes.json();
  if (!mediaInfo?.url) {
    console.error('No se pudo obtener la URL del audio desde Meta:', mediaInfo);
    return null;
  }

  const encoding = sttEncodingFor(mediaInfo.mime_type || '');
  if (!encoding) {
    console.error('Formato de audio no soportado para transcripción:', mediaInfo.mime_type);
    return null;
  }

  const audioRes = await fetch(mediaInfo.url, {
    headers: { 'Authorization': `Bearer ${whatsappToken}` },
  });
  const audioBuffer = await audioRes.arrayBuffer();

  // Estimación conservadora de duración (asumimos ~16kbps, bitrate típico de notas de voz de WhatsApp)
  const estimatedSeconds = Math.ceil((audioBuffer.byteLength * 8) / 16000);

  const usedSeconds = await getMonthlySttUsage();
  if (usedSeconds + estimatedSeconds > MONTHLY_AUDIO_LIMIT_SECONDS) {
    console.log(`Límite mensual de transcripción de audio alcanzado (${usedSeconds}s usados).`);
    return null;
  }

  try {
    const sttRes = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_STT_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            encoding,
            sampleRateHertz: 16000,
            languageCode: 'es-AR',
            alternativeLanguageCodes: ['es-ES', 'en-US'],
          },
          audio: { content: arrayBufferToBase64(audioBuffer) },
        }),
      }
    );

    const sttJson = await sttRes.json();
    const transcript = (sttJson?.results || [])
      .map((r: any) => r.alternatives?.[0]?.transcript)
      .filter(Boolean)
      .join(' ')
      .trim();

    if (!transcript) {
      console.error('Google STT no devolvió transcripción:', sttJson);
      return null;
    }

    await addMonthlySttUsage(estimatedSeconds);
    return transcript;
  } catch (err) {
    console.error('Error llamando a Google Speech-to-Text:', err);
    return null;
  }
}

// Verifica la firma X-Hub-Signature-256 que Meta envía en cada webhook real.
// Debe calcularse sobre el body crudo (string), antes de parsearlo a JSON,
// porque re-serializar el JSON puede no coincidir byte a byte con lo firmado.
async function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expectedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const receivedHex = signatureHeader.slice('sha256='.length);

  // Comparación en tiempo constante para evitar timing attacks
  if (expectedHex.length !== receivedHex.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    mismatch |= expectedHex.charCodeAt(i) ^ receivedHex.charCodeAt(i);
  }
  return mismatch === 0;
}

// Envía un mensaje de texto simple por WhatsApp (Meta Graph API)
async function sendWhatsAppText(phoneId: string, token: string, toRaw: string, text: string) {
  // HACK ARGENTINA: Meta Sandbox odia el '9'.
  let to = toRaw;
  if (to.startsWith('549') && to.length === 13) {
    to = '54' + to.substring(3);
  }

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
  return res.json();
}

serve(async (req) => {
  // Manejo de CORS para llamadas desde el navegador (si aplica)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // ----------------------------------------------------
  // 1. Verificación GET de Meta (Webhooks)
  // ----------------------------------------------------
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const VERIFY_TOKEN = Deno.env.get('WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new Response(challenge, { status: 200 });
    } else {
      return new Response('Forbidden', { status: 403 });
    }
  }

  // ----------------------------------------------------
  // 2. Recepción POST de Mensajes (Webhooks)
  // ----------------------------------------------------
  if (req.method === 'POST') {
    try {
      const rawBody = await req.text();

      const appSecret = Deno.env.get('META_APP_SECRET') || '';
      if (!appSecret) {
        console.error('Falta configurar META_APP_SECRET; se rechaza el webhook por seguridad.');
        return new Response('Server misconfigured', { status: 500 });
      }

      const signatureHeader = req.headers.get('x-hub-signature-256');
      const isValidSignature = await verifyMetaSignature(rawBody, signatureHeader, appSecret);
      if (!isValidSignature) {
        console.error('Firma X-Hub-Signature-256 inválida. Request rechazado.');
        return new Response('Invalid signature', { status: 403 });
      }

      const body = JSON.parse(rawBody);

      // Validación básica de la estructura de WhatsApp
      if (body.object !== 'whatsapp_business_account') {
        return new Response('Not a WhatsApp event', { status: 404 });
      }

      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      // Si no hay mensajes (por ejemplo, confirmaciones de lectura), ignoramos
      if (!value?.messages || value.messages.length === 0) {
        return new Response('EVENT_RECEIVED', { status: 200 });
      }

      const message = value.messages[0];
      const contact = value.contacts?.[0];
      
      const phoneId = value.metadata.phone_number_id; // ID del número que recibió el mensaje (NUESTRO BOT)
      const userPhone = message.from; // Número del cliente que escribe
      const userName = contact?.profile?.name || 'Usuario';

      // ========================================================
      // LÓGICA MULTI-TENANT: Buscamos a qué empresa pertenece
      // ========================================================
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .eq('whatsapp_phone_number_id', phoneId)
        .eq('status', 'active')
        .single();

      if (bizError || !business) {
        console.error('Empresa no encontrada o inactiva para este número:', phoneId);
        return new Response('EVENT_RECEIVED', { status: 200 }); // Siempre 200 a Meta
      }

      const businessId = business.id;
      const whatsappToken = business.whatsapp_access_token;

      // Extraemos el texto del mensaje (soporta texto y audio; el resto se ignora)
      let userText = '';
      if (message.type === 'text') {
        userText = message.text.body;
      } else if (message.type === 'audio') {
        const transcript = await transcribeWhatsappAudio(message.audio.id, whatsappToken);
        if (!transcript) {
          await sendWhatsAppText(
            phoneId,
            whatsappToken,
            userPhone,
            'Por el momento no puedo procesar este audio 🙏. ¿Podrías escribirme tu consulta por texto? Si preferís, puedo comunicarte con uno de nuestros agentes.'
          );
          return new Response('EVENT_RECEIVED', { status: 200 });
        }
        userText = transcript;
      } else {
        // Por ahora ignoramos imágenes/videos/documentos para simplificar
        return new Response('EVENT_RECEIVED', { status: 200 });
      }

      console.log(`Mensaje recibido de ${userPhone} en la línea ${phoneId}: "${userText}"`);

      // ========================================================
      // GESTIÓN DE CLIENTE Y CONVERSACIÓN
      // ========================================================
      
      // Buscar o crear cliente
      let { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .eq('platform', 'whatsapp')
        .eq('platform_id', userPhone)
        .single();

      if (!customer) {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({
            business_id: businessId,
            platform: 'whatsapp',
            platform_id: userPhone,
            name: userName,
            phone: userPhone
          })
          .select()
          .single();
        customer = newCustomer;
      }

      // Buscar o crear conversación (activa o escalada)
      let { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('business_id', businessId)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Si no hay conversación, o si estuviera explícitamente "closed" (para futuras features)
      if (!conversation || conversation.status === 'closed') {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            business_id: businessId,
            customer_id: customer.id,
            status: 'active'
          })
          .select()
          .single();
        conversation = newConv;
      }

      // ========================================================
      // GUARDAR MENSAJE DEL USUARIO
      // ========================================================
      await supabase.from('messages').insert({
        business_id: businessId,
        conversation_id: conversation.id,
        role: 'user',
        content: userText,
        platform_msg_id: message.id
      });

      // Si está escalado a humano, no responde la IA
      if (conversation.status === 'escalated') {
        console.log('Conversación escalada, el bot no responde.');
        return new Response('EVENT_RECEIVED', { status: 200 });
      }

      // ========================================================
      // CARGAR CONFIGURACIÓN Y FAQS DEL TENANT (EMPRESA)
      // ========================================================
      const { data: config } = await supabase
        .from('bot_config')
        .select('*')
        .eq('business_id', businessId)
        .single();

      const { data: faqsData } = await supabase
        .from('faqs')
        .select('question, answer')
        .eq('business_id', businessId)
        .eq('is_active', true);

      let faqsText = 'Preguntas Frecuentes de la empresa:\n';
      faqsData?.forEach(f => {
        faqsText += `Q: ${f.question}\nA: ${f.answer}\n\n`;
      });

      // ========================================================
      // LLAMADA A ANTHROPIC (CLAUDE)
      // ========================================================
      // Recuperar los últimos 5 mensajes para contexto
      const { data: history } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(6); // 5 historial + 1 actual

      // Formatear para Claude (orden cronológico y alternancia estricta)
      const rawHistory = (history || []).reverse();
      const formattedHistory: any[] = [];
      
      for (const msg of rawHistory) {
        const role = msg.role === 'user' ? 'user' : 'assistant';
        if (formattedHistory.length === 0) {
          // Anthropic exige que el primer mensaje sea del usuario
          if (role === 'user') {
            formattedHistory.push({ role, content: msg.content });
          }
        } else {
          const lastMsg = formattedHistory[formattedHistory.length - 1];
          if (lastMsg.role === role) {
            // Combinar mensajes consecutivos del mismo rol
            lastMsg.content += `\n\n${msg.content}`;
          } else {
            formattedHistory.push({ role, content: msg.content });
          }
        }
      }

      let customerCrmContext = '';
      if (customer) {
        customerCrmContext = `
Información y Ficha CRM del Cliente:
- Nombre: ${customer.name || 'No especificado'}
- Teléfono: ${customer.phone || 'No especificado'}
- Email: ${customer.email || 'No registrado'}
- DNI / Pasaporte: ${customer.dni || 'No registrado'}
- Notas y Preferencias del Viajero: ${customer.notes || 'Sin notas registradas'}
(Usa esta información para personalizar tu trato y recordar sus preferencias de viaje de forma natural, sin decirle directamente que estás leyendo una ficha).
`;
      }

      const systemPrompt = `Eres un asistente de IA para la empresa "${business.name}".
Tu personalidad es: ${config?.bot_personality || 'Amable y profesional'}.
${customerCrmContext}
Información de la empresa (FAQs):
${faqsText}

Información de contacto adicional: ${JSON.stringify(config?.contact_info || {})}

Si el usuario pregunta algo que no sabes o pide hablar con un humano, indícaselo cortésmente, y el sistema escalará el chat.
Reglas:
- Nunca inventes promociones o precios que no estén en las FAQs.
- Responde siempre de manera concisa (máximo 2-3 párrafos cortos).`;

      let aiResponse = "Lo siento, tuve un problema procesando tu mensaje. ¿Podrías repetirlo?";

      try {
        const claudeResp = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          system: systemPrompt,
          messages: formattedHistory,
        });
        
        aiResponse = claudeResp.content[0].text;
      } catch (claudeError) {
        console.error("Error llamando a Claude:", claudeError);
      }

      // ========================================================
      // RESPONDER A WHATSAPP (META API)
      // ========================================================
      if (whatsappToken && aiResponse) {
        const metaResJson = await sendWhatsAppText(phoneId, whatsappToken, userPhone, aiResponse);
        console.log("Respuesta de Meta API:", metaResJson);
      }

      // ========================================================
      // GUARDAR RESPUESTA DEL BOT
      // ========================================================
      await supabase.from('messages').insert({
        business_id: businessId,
        conversation_id: conversation.id,
        role: 'assistant',
        content: aiResponse
      });

      return new Response('EVENT_RECEIVED', { status: 200 });

    } catch (e) {
      console.error('Error procesando webhook:', e);
      // Siempre devolver 200 a Meta para que no reintente con pánico
      return new Response('EVENT_RECEIVED', { status: 200 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
