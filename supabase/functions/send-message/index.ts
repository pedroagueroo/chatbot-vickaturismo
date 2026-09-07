// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppMessage } from "../_shared/whatsapp.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const VALID_MEDIA_TYPES = ['image', 'audio', 'document'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { conversation_id, content, media_url, media_type, file_name } = await req.json();

    const caption = (content || '').trim();
    const hasMedia = !!media_url;

    if (!conversation_id || (!caption && !hasMedia)) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros: conversation_id y (content o media_url)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (hasMedia && !VALID_MEDIA_TYPES.includes(media_type)) {
      return new Response(
        JSON.stringify({ error: `media_type inválido. Debe ser uno de: ${VALID_MEDIA_TYPES.join(', ')}` }),
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

    // 2. Enviar mensaje a Meta WhatsApp Cloud API (texto o adjunto)
    const metaData = await sendWhatsAppMessage(
      business.whatsapp_phone_number_id,
      business.whatsapp_access_token,
      customer.phone,
      hasMedia
        ? { type: media_type, mediaUrl: media_url, caption, fileName: file_name }
        : { type: 'text', text: caption }
    );

    console.log('Respuesta de Meta al enviar mensaje de agente:', metaData);

    if (metaData.error) {
      console.error('Meta API Error:', metaData.error);
      return new Response(
        JSON.stringify({ error: metaData.error.message || 'Error enviando mensaje a WhatsApp', details: metaData.error }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Guardar el mensaje en la base de datos con intent = 'human_agent'
    const { data: savedMsg, error: msgError } = await supabase
      .from('messages')
      .insert({
        business_id: conversation.business_id,
        conversation_id: conversation.id,
        role: 'assistant',
        intent: 'human_agent',
        content: caption,
        platform_msg_id: metaData?.messages?.[0]?.id || null,
        ...(hasMedia ? { media_url, media_type, file_name: file_name || null } : {}),
      })
      .select()
      .single();

    if (msgError) {
      console.error('Error guardando mensaje en DB:', msgError);
    }

    // 4. Si la conversación no estaba escalada, la marcamos como escalada
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
