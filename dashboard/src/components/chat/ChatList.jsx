import React, { useState } from 'react';
import { formatRelativeTime } from '../../utils/dateFormatter';
import { MessageSquare, MoreVertical, Trash2, CheckCircle2, X, Search } from 'lucide-react';

const LAST_SEEN_KEY = 'vicka_chat_last_seen';

const readLastSeenMap = () => {
  try {
    return JSON.parse(localStorage.getItem(LAST_SEEN_KEY) || '{}');
  } catch {
    return {};
  }
};

const markConversationSeen = (convId) => {
  try {
    const map = readLastSeenMap();
    map[convId] = new Date().toISOString();
    localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(map));
  } catch {
    // localStorage no disponible (modo privado, etc.) — no bloquea la UI
  }
};

export const ChatList = ({ conversations, activeConvId, onSelectConv, onDeleteConv }) => {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSeenMap] = useState(readLastSeenMap);

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center text-slate-500 space-y-2 p-8">
        <MessageSquare className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
        <p className="text-xs font-medium">No hay chats activos aún</p>
      </div>
    );
  }

  const handleMenuClick = (e, id) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    setMenuOpenId(null);
    if (onDeleteConv) onDeleteConv(id);
  };

  const handleSelect = (conv) => {
    markConversationSeen(conv.id);
    onSelectConv(conv);
  };

  // Cierra el menú si se hace clic fuera de él en otro lugar de la app
  React.useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const q = searchQuery.trim().toLowerCase();
  const filteredConversations = q
    ? conversations.filter((conv) => {
        const customer = conv.customers || {};
        return (
          (customer.name && customer.name.toLowerCase().includes(q)) ||
          (customer.phone && customer.phone.toLowerCase().includes(q))
        );
      })
    : conversations;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Búsqueda */}
      <div className="p-3 border-b border-slate-700/40 flex-shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full surface-well focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-md py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 divide-y divide-slate-800/60 overflow-y-auto scroll-stable relative">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <Search className="w-6 h-6 mx-auto text-slate-600 opacity-60" />
            <p className="text-xs font-medium">Ningún chat coincide con "{searchQuery}"</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = conv.id === activeConvId;
            const customer = conv.customers || {};
            const isEscalated = conv.status === 'escalated';
            const isMenuOpen = menuOpenId === conv.id;
            const lastActivity = conv.updated_at || conv.created_at;
            const isUnread =
              !isSelected &&
              lastActivity &&
              new Date(lastActivity) > new Date(lastSeenMap[conv.id] || 0);

            return (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv)}
                className={`w-full p-4 text-left flex items-start space-x-3 transition-colors relative overflow-hidden ${
                  isSelected
                    ? 'bg-teal-950/50 border-l-[3px] border-teal-500'
                    : 'border-l-[3px] border-transparent hover:bg-slate-800/40'
                }`}
              >
                {/* Opciones de Chat: panel que se desliza sobre la fila */}
                <div
                  className={`absolute inset-0 z-20 flex items-center justify-center space-x-2 bg-slate-900 px-2 transition-all duration-150 ease-out ${
                    isMenuOpen
                      ? 'opacity-100 translate-x-0 pointer-events-auto'
                      : 'opacity-0 translate-x-2 pointer-events-none'
                  }`}
                  onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(null);
                      // TODO: Implementar resolver
                    }}
                    className="flex-1 max-w-[110px] py-2 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded border border-slate-700 flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolver</span>
                  </button>

                  <button
                    onClick={(e) => handleDeleteClick(e, conv.id)}
                    className="flex-1 max-w-[110px] py-2 px-2 bg-red-950/60 hover:bg-red-950 text-red-400 text-xs font-medium rounded border border-red-900 flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); }}
                    className="p-1.5 ml-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 font-bold text-sm">
                    {customer.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  {isEscalated && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold text-slate-200 truncate pr-2 flex items-center gap-1.5">
                      {isUnread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                      )}
                      <span className="truncate">{customer.name || customer.phone || 'Cliente WhatsApp'}</span>
                    </h3>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="text-[10px] text-slate-500">
                        {formatRelativeTime(conv.updated_at || conv.created_at)}
                      </span>

                      {/* Botón 3 puntitos */}
                      <div className="relative">
                        <button
                          onClick={(e) => handleMenuClick(e, conv.id)}
                          className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <p className="text-slate-400 truncate text-[11px]">
                      {customer.phone || 'WhatsApp'}
                    </p>
                    {isEscalated && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Escalado
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
