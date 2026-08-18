import React from 'react';
import { formatRelativeTime } from '../../utils/dateFormatter';
import { MessageSquare } from 'lucide-react';

export const ChatList = ({ conversations, activeConvId, onSelectConv }) => {
  if (!conversations || conversations.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 space-y-2">
        <MessageSquare className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
        <p className="text-xs font-medium">No hay chats activos aún</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-[calc(100vh-12rem)]">
      {conversations.map((conv) => {
        const isSelected = conv.id === activeConvId;
        const customer = conv.customers || {};
        const isEscalated = conv.status === 'escalated';

        return (
          <button
            key={conv.id}
            onClick={() => onSelectConv(conv)}
            className={`w-full p-4 text-left flex items-start space-x-3 transition-colors ${
              isSelected
                ? 'bg-indigo-600/15 border-l-4 border-indigo-500'
                : 'hover:bg-slate-800/40'
            }`}
          >
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
                <h3 className="text-xs font-semibold text-slate-200 truncate">
                  {customer.name || customer.phone || 'Cliente WhatsApp'}
                </h3>
                <span className="text-[10px] text-slate-500 flex-shrink-0">
                  {formatRelativeTime(conv.updated_at || conv.created_at)}
                </span>
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
      })}
    </div>
  );
};
