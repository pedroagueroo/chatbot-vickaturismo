import React from 'react';
import { formatMessageTime } from '../../utils/dateFormatter';
import { Bot, User, UserCheck } from 'lucide-react';

export const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';
  const isHumanAgent = message.intent === 'human_agent';

  return (
    <div className={`flex w-full ${isUser ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className={`max-w-[75%] md:max-w-[65%] rounded-2xl p-3.5 shadow-sm text-xs md:text-sm leading-relaxed space-y-1 ${
          isUser
            ? 'bg-slate-800 border border-slate-700/80 text-slate-100 rounded-tl-none'
            : isHumanAgent
            ? 'bg-indigo-700 border border-indigo-500/80 text-white rounded-tr-none shadow-indigo-900/30'
            : 'bg-indigo-600 border border-indigo-500/50 text-white rounded-tr-none'
        }`}
      >
        <div className="flex items-center space-x-1.5 opacity-80 text-[10px] font-semibold tracking-wide uppercase mb-1">
          {isUser ? (
            <>
              <User className="w-3 h-3 text-slate-400" />
              <span className="text-slate-400">Cliente</span>
            </>
          ) : isHumanAgent ? (
            <>
              <UserCheck className="w-3 h-3 text-amber-300" />
              <span className="text-amber-300">Agente Humano</span>
            </>
          ) : (
            <>
              <Bot className="w-3 h-3 text-indigo-200" />
              <span className="text-indigo-200">Asistente IA</span>
            </>
          )}
        </div>

        <p className="whitespace-pre-wrap break-words">{message.content}</p>

        <div className="flex justify-end items-center text-[10px] opacity-70 pt-0.5 space-x-1">
          <span>{formatMessageTime(message.created_at)}</span>
        </div>
      </div>
    </div>
  );
};
