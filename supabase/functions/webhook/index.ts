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
      const body = await req.json();

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
      
      // Extraemos el texto del mensaje
      let userText = '';
      if (message.type === 'text') {
        userText = message.text.body;
      } else {
        // Por ahora ignoramos audios/imágenes para simplificar
        return new Response('EVENT_RECEIVED', { status: 200 });
      }

      console.log(`Mensaje recibido de ${userPhone} en la línea ${phoneId}: "${userText}"`);

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
        
        // HACK ARGENTINA: Meta Sandbox odia el '9'. 
        // Si el número empieza con 549 y tiene 13 caracteres, le sacamos el 9 para responder.
        let replyPhone = userPhone;
        if (replyPhone.startsWith('549') && replyPhone.length === 13) {
          replyPhone = '54' + replyPhone.substring(3);
        }

        const metaRes = await fetch(
          `https://graph.facebook.com/v19.0/${phoneId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsappToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: replyPhone,
              type: 'text',
              text: { body: aiResponse },
            }),
          }
        );
        
        const metaResJson = await metaRes.json();
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
