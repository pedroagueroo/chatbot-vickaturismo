import React, { useState, useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { Send, UserCheck, Bot, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

// Distancia (px) al final del scroll dentro de la cual consideramos que el usuario
// "está al pie" del chat y por lo tanto es seguro autoscrollear ante nuevos mensajes.
const AUTO_SCROLL_THRESHOLD = 120;

export const ChatWindow = ({ conversation, messages, onToggleEscalate }) => {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const prevConvIdRef = useRef(null);

  const customer = conversation?.customers || {};
  const isEscalated = conversation?.status === 'escalated';

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < AUTO_SCROLL_THRESHOLD;
  };

  useEffect(() => {
    const isNewConversation = conversation?.id !== prevConvIdRef.current;
    prevConvIdRef.current = conversation?.id ?? null;

    // Al abrir una conversación distinta, saltamos directo al final (sin animación:
    // no tiene sentido "barrer" visualmente todo el historial al cambiar de chat).
    if (isNewConversation) {
      shouldAutoScrollRef.current = true;
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      return;
    }

    // Para mensajes nuevos en la MISMA conversación, solo autoscrolleamos si el
    // usuario ya estaba al pie del chat. Si subió a leer historial, no lo interrumpimos.
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, conversation?.id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    const textToSend = inputText.trim();
    setInputText('');

    try {
      // 1. Invocar Edge Function para enviar a WhatsApp vía Meta API y guardar en DB
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          conversation_id: conversation.id,
          content: textToSend,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        console.error('Error desde Edge Function:', data.error, data.details);
        toast.error(`Error al enviar mensaje: ${data.error}`);
      } else {
        toast.success('Mensaje enviado a WhatsApp');
      }

      // 2. Si la conversación no estaba escalada, actualizamos el estado local a escalado
      if (!isEscalated) {
        await onToggleEscalate(conversation.id, 'escalated');
      }
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      toast.error(`Error de conexión al enviar: ${err.message || 'Error desconocido'}`);
    } finally {
      setSending(false);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 min-h-0 flex flex-col justify-center items-center text-slate-500 p-8 space-y-3">
        <Bot className="w-12 h-12 text-slate-600 opacity-40" />
        <p className="text-sm font-medium">Selecciona un chat para ver la conversación en vivo</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 flex-shrink-0">
            {customer.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white truncate">
              {customer.name || 'Cliente WhatsApp'}
            </h2>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Phone className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <span className="truncate">{customer.phone || 'Sin número'}</span>
            </div>
          </div>
        </div>

        {/* Toggle Escalate Button */}
        <button
          onClick={() =>
            onToggleEscalate(conversation.id, isEscalated ? 'active' : 'escalated')
          }
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors btn-neu flex-shrink-0 ${
            isEscalated
              ? 'bg-amber-950/50 border border-amber-800 text-amber-400 hover:bg-amber-950'
              : 'bg-teal-600 hover:bg-teal-500 text-white'
          }`}
        >
          {isEscalated ? (
            <>
              <Bot className="w-4 h-4" />
              <span>Devolver a IA</span>
            </>
          ) : (
            <>
              <UserCheck className="w-4 h-4" />
              <span>Tomar Control Humano</span>
            </>
          )}
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-stable p-4 md:p-6 space-y-2"
      >
        {messages.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No hay mensajes registrados en este chat.
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-slate-700/50 flex items-center space-x-2 flex-shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isEscalated
              ? 'Escribe tu respuesta como agente humano...'
              : 'Escribe para responder (tomará el control del chat)...'
          }
          className="flex-1 min-w-0 surface-well focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-md px-4 py-2.5 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="p-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:hover:bg-teal-600 text-white rounded-md transition-colors btn-neu"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
