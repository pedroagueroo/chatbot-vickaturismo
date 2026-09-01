import React from 'react';
import { formatMessageTime } from '../../utils/dateFormatter';
import { Bot, User, UserCheck } from 'lucide-react';

export const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';
  const isHumanAgent = message.intent === 'human_agent';

  return (
    <div className={`flex w-full ${isUser ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className={`max-w-[75%] md:max-w-[65%] rounded-lg p-3.5 text-xs md:text-sm leading-relaxed space-y-1 border backdrop-blur-md shadow-lg ${
          isUser
            ? 'bg-slate-800/60 border-slate-600/40 text-slate-100 rounded-tl-sm shadow-black/20'
            : isHumanAgent
            ? 'bg-orange-700/55 border-orange-500/40 text-white rounded-tr-sm shadow-orange-950/40'
            : 'bg-teal-600/55 border-teal-400/40 text-white rounded-tr-sm shadow-teal-950/40'
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
              <UserCheck className="w-3 h-3 text-orange-200" />
              <span className="text-orange-200">Agente Humano</span>
            </>
          ) : (
            <>
              <Bot className="w-3 h-3 text-teal-200" />
              <span className="text-teal-200">Asistente IA</span>
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
