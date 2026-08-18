import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { ChatList } from '../../components/chat/ChatList';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { CustomerProfile } from '../../components/chat/CustomerProfile';
import { MessageSquare, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const Inbox = () => {
  const { businessId } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Cargar la lista inicial de conversaciones
  useEffect(() => {
    if (!businessId) return;

    setActiveConv(null);
    fetchConversations();

    // Suscripción Realtime a nuevas conversaciones
    const convChannel = supabase
      .channel('public:conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(convChannel);
    };
  }, [businessId]);

  // 2. Cargar mensajes y suscribirse en tiempo real a la conversación activa
  useEffect(() => {
    if (!activeConv) {
      setMessages([]);
      return;
    }

    fetchMessages(activeConv.id);

    // Suscripción Realtime a nuevos mensajes
    const msgChannel = supabase
      .channel(`public:messages:${activeConv.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [activeConv]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, customers(*)')
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);

      // Si no hay ninguna seleccionada y hay datos, elegimos la primera
      if (!activeConv && data && data.length > 0) {
        setActiveConv(data[0]);
      }
    } catch (err) {
      console.error('Error cargando conversaciones:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error cargando mensajes:', err.message);
    }
  };

  const handleToggleEscalate = async (convId, newStatus) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', convId);

      if (error) throw error;

      // Actualizar estado local
      setActiveConv((prev) => (prev ? { ...prev, status: newStatus } : null));
      fetchConversations();

      if (newStatus === 'escalated') {
        toast.success('Chat escalado a control humano');
      } else {
        toast.success('Chat devuelto a la IA');
      }
    } catch (err) {
      console.error('Error actualizando estado:', err.message);
      toast.error('Error al cambiar estado del chat');
    }
  };

  const handleDeleteConv = async (convId) => {
    // Confirmación nativa simple
    if (!window.confirm('¿Estás seguro de que deseas eliminar este chat y todos sus mensajes? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      // Por cascade_delete, borrar la conversación debería borrar los mensajes asociados si la BD está configurada así.
      // Si no, borramos primero los mensajes. Lo más seguro es borrar los mensajes de ese chat primero.
      await supabase.from('messages').delete().eq('conversation_id', convId);
      const { error } = await supabase.from('conversations').delete().eq('id', convId);

      if (error) throw error;

      toast.success('Chat eliminado correctamente');
      
      if (activeConv?.id === convId) {
        setActiveConv(null);
        setMessages([]);
      }
      
      setConversations((prev) => prev.filter((c) => c.id !== convId));
    } catch (err) {
      console.error('Error eliminando chat:', err.message);
      toast.error('Hubo un error al eliminar el chat');
    }
  };

  const handleCustomerUpdate = (updatedCustomer) => {
    setActiveConv((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        customers: updatedCustomer,
      };
    });

    setConversations((prev) =>
      prev.map((c) =>
        c.customer_id === updatedCustomer.id
          ? { ...c, customers: updatedCustomer }
          : c
      )
    );
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl relative">
      {/* Columna Izquierda: Lista de Chats */}
      <div className="w-full md:w-72 lg:w-80 border-r border-slate-800 flex flex-col bg-slate-900/80 shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>Chats Recientes</span>
          </h2>
          <span className="text-[10px] font-bold bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">
            {conversations.length}
          </span>
        </div>
        <ChatList
          conversations={conversations}
          activeConvId={activeConv?.id}
          onSelectConv={(conv) => setActiveConv(conv)}
          onDeleteConv={handleDeleteConv}
        />
      </div>

      {/* Columna Central: Ventana de Chat */}
      <div className="flex-1 bg-slate-950/40 flex flex-col min-w-0">
        <ChatWindow
          conversation={activeConv}
          messages={messages}
          onToggleEscalate={handleToggleEscalate}
        />
      </div>

      {/* Columna Derecha: Ficha CRM del Cliente */}
      <div className="w-full md:w-72 lg:w-80 shrink-0 h-full">
        <CustomerProfile
          customer={activeConv?.customers}
          onCustomerUpdate={handleCustomerUpdate}
        />
      </div>
    </div>
  );
};
