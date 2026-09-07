// @ts-nocheck
// Helper compartido para enviar mensajes por WhatsApp Cloud API (Meta Graph API).
// Usado por las Edge Functions `webhook` (respuestas del bot) y `send-message` (agente humano).

export type WhatsAppMessagePayload = {
  type: 'text' | 'image' | 'audio' | 'document';
  text?: string;
  mediaUrl?: string;
  caption?: string;
  fileName?: string;
};

// HACK ARGENTINA: Meta Sandbox odia el '9' que WhatsApp antepone a los celulares argentinos.
export function normalizePhone(phoneRaw: string): string {
  let phone = phoneRaw;
  if (phone.startsWith('549') && phone.length === 13) {
    phone = '54' + phone.substring(3);
  }
  return phone;
}

export async function sendWhatsAppMessage(
  phoneId: string,
  token: string,
  toRaw: string,
  payload: WhatsAppMessagePayload
) {
  const to = normalizePhone(toRaw);

  let body: Record<string, unknown>;
  switch (payload.type) {
    case 'text':
      body = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: payload.text || '' },
      };
      break;
    case 'image':
      body = {
        messaging_product: 'whatsapp',
        to,
        type: 'image',
        image: {
          link: payload.mediaUrl,
          ...(payload.caption ? { caption: payload.caption } : {}),
        },
      };
      break;
    case 'audio':
      body = {
        messaging_product: 'whatsapp',
        to,
        type: 'audio',
        audio: { link: payload.mediaUrl },
      };
      break;
    case 'document':
      body = {
        messaging_product: 'whatsapp',
        to,
        type: 'document',
        document: {
          link: payload.mediaUrl,
          ...(payload.caption ? { caption: payload.caption } : {}),
          ...(payload.fileName ? { filename: payload.fileName } : {}),
        },
      };
      break;
    default:
      throw new Error(`Tipo de mensaje de WhatsApp no soportado: ${payload.type}`);
  }

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return res.json();
}
