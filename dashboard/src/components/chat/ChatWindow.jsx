import React, { useState, useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { Send, UserCheck, Bot, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

export const ChatWindow = ({ conversation, messages, onToggleEscalate }) => {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const customer = conversation?.customers || {};
  const isEscalated = conversation?.status === 'escalated';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      <div className="h-full flex flex-col justify-center items-center text-slate-500 p-8 space-y-3">
        <Bot className="w-12 h-12 text-slate-600 opacity-40" />
        <p className="text-sm font-medium">Selecciona un chat para ver la conversación en vivo</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950/60">
      {/* Chat Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200">
            {customer.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>{customer.name || 'Cliente WhatsApp'}</span>
            </h2>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Phone className="w-3 h-3 text-slate-500" />
              <span>{customer.phone || 'Sin número'}</span>
            </div>
          </div>
        </div>

        {/* Toggle Escalate Button */}
        <button
          onClick={() =>
            onToggleEscalate(conversation.id, isEscalated ? 'active' : 'escalated')
          }
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            isEscalated
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20'
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
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2">
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
        className="p-3 bg-slate-900 border-t border-slate-800 flex items-center space-x-2"
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
          className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl transition-all shadow-md shadow-indigo-600/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
