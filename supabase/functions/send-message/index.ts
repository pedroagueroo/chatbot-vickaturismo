// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { conversation_id, content } = await req.json();

    if (!conversation_id || !content?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros: conversation_id y content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Obtener la conversación, el cliente y la empresa
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        business_id,
        status,
        customers (
          id,
          phone
        ),
        businesses (
          id,
          whatsapp_phone_number_id,
          whatsapp_access_token
        )
      `)
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      console.error('Error buscando conversación:', convError);
      return new Response(
        JSON.stringify({ error: 'Conversación no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const business = conversation.businesses;
    const customer = conversation.customers;

    if (!business?.whatsapp_phone_number_id || !business?.whatsapp_access_token) {
      return new Response(
        JSON.stringify({ error: 'La empresa no tiene configuradas las credenciales de WhatsApp' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customer?.phone) {
      return new Response(
        JSON.stringify({ error: 'El cliente no tiene número de teléfono registrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Normalizar número de teléfono (Hack Argentina: quitar el 9 de 549 si corresponde)
    let replyPhone = customer.phone;
    if (replyPhone.startsWith('549') && replyPhone.length === 13) {
      replyPhone = '54' + replyPhone.substring(3);
    }

    // 3. Enviar mensaje a Meta WhatsApp Cloud API
    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${business.whatsapp_phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${business.whatsapp_access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: replyPhone,
          type: 'text',
          text: { body: content.trim() },
        }),
      }
    );

    const metaData = await metaRes.json();
    console.log('Respuesta de Meta al enviar mensaje de agente:', metaData);

    if (metaData.error) {
      console.error('Meta API Error:', metaData.error);
      return new Response(
        JSON.stringify({ error: metaData.error.message || 'Error enviando mensaje a WhatsApp', details: metaData.error }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Guardar el mensaje en la base de datos con intent = 'human_agent'
    const { data: savedMsg, error: msgError } = await supabase
      .from('messages')
      .insert({
        business_id: conversation.business_id,
        conversation_id: conversation.id,
        role: 'assistant',
        intent: 'human_agent',
        content: content.trim(),
        platform_msg_id: metaData?.messages?.[0]?.id || null,
      })
      .select()
      .single();

    if (msgError) {
      console.error('Error guardando mensaje en DB:', msgError);
    }

    // 5. Si la conversación no estaba escalada, la marcamos como escalada
    if (conversation.status !== 'escalated') {
      await supabase
        .from('conversations')
        .update({ status: 'escalated', updated_at: new Date().toISOString() })
        .eq('id', conversation.id);
    }

    return new Response(
      JSON.stringify({ success: true, message: savedMsg, meta: metaData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error en Edge Function send-message:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
