import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { ChatList } from '../../components/chat/ChatList';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { CustomerProfile } from '../../components/chat/CustomerProfile';
import { MessageSquare, Loader2, ChevronLeft, ChevronRight, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';

export const Inbox = () => {
  const { businessId } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  // Controla qué panel se ve en mobile: la app tiene 3 columnas (chats / chat / ficha)
  // pero en una pantalla chica solo entra una a la vez.
  const [mobilePane, setMobilePane] = useState('list');

  const handleSelectConv = (conv) => {
    setActiveConv(conv);
    setMobilePane('chat');
  };

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
      <div className="h-full flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500 mb-2" />
      </div>
    );
  }

  return (
    <div className="h-full surface-glass rounded-md overflow-hidden flex flex-col md:flex-row relative">
      {/* Columna Izquierda: Lista de Chats */}
      <div
        className={`w-full md:w-72 lg:w-80 border-r border-slate-700/50 flex-col shrink-0 h-full overflow-hidden ${
          mobilePane === 'list' ? 'flex' : 'hidden md:flex'
        }`}
      >
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between flex-shrink-0">
          <h2 className="font-display text-sm font-bold text-white flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-teal-500" />
            <span>Chats Recientes</span>
          </h2>
          <span className="text-[10px] font-bold bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">
            {conversations.length}
          </span>
        </div>
        <ChatList
          conversations={conversations}
          activeConvId={activeConv?.id}
          onSelectConv={handleSelectConv}
          onDeleteConv={handleDeleteConv}
        />
      </div>

      {/* Columna Central: Ventana de Chat */}
      <div
        className={`flex-1 bg-slate-950/40 flex-col min-w-0 h-full overflow-hidden ${
          mobilePane === 'chat' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Barra de navegación solo mobile: volver a la lista / ir a la ficha */}
        <div className="md:hidden flex-shrink-0 flex items-center gap-2 p-2 border-b border-slate-700/50">
          <button
            onClick={() => setMobilePane('list')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center gap-1 text-xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Chats</span>
          </button>
          {activeConv && (
            <button
              onClick={() => setMobilePane('profile')}
              className="ml-auto p-1.5 rounded hover:bg-slate-800 text-teal-400 text-xs flex items-center gap-1 cursor-pointer"
            >
              <UserCog className="w-3.5 h-3.5" />
              <span>Ficha</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <ChatWindow
          conversation={activeConv}
          messages={messages}
          onToggleEscalate={handleToggleEscalate}
        />
      </div>

      {/* Columna Derecha: Ficha CRM del Cliente */}
      <div
        className={`w-full md:w-72 lg:w-80 shrink-0 h-full overflow-hidden flex-col ${
          mobilePane === 'profile' ? 'flex' : 'hidden md:flex'
        }`}
      >
        <div className="md:hidden flex-shrink-0 flex items-center gap-2 p-2 border-b border-slate-700/50">
          <button
            onClick={() => setMobilePane('chat')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center gap-1 text-xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver al chat</span>
          </button>
        </div>
        <CustomerProfile
          customer={activeConv?.customers}
          onCustomerUpdate={handleCustomerUpdate}
        />
      </div>
    </div>
  );
};
