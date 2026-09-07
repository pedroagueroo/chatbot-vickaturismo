import React from 'react';
import { formatMessageTime } from '../../utils/dateFormatter';
import { Bot, User, UserCheck, FileText, Download } from 'lucide-react';

const MediaContent = ({ message }) => {
  if (!message.media_type) return null;

  if (message.media_type === 'image') {
    return (
      <a href={message.media_url} target="_blank" rel="noopener noreferrer">
        <img
          src={message.media_url}
          alt={message.file_name || 'Imagen'}
          className="rounded-md max-w-full max-h-72 object-cover border border-white/10"
        />
      </a>
    );
  }

  if (message.media_type === 'audio') {
    return (
      <audio controls src={message.media_url} className="w-full max-w-[260px] h-9">
        Tu navegador no soporta audio.
      </audio>
    );
  }

  if (message.media_type === 'document') {
    return (
      <a
        href={message.media_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center space-x-2.5 bg-black/20 hover:bg-black/30 border border-white/10 rounded-md p-2.5 transition-colors"
      >
        <FileText className="w-6 h-6 flex-shrink-0 opacity-80" />
        <span className="text-xs font-medium truncate flex-1">
          {message.file_name || 'Documento adjunto'}
        </span>
        <Download className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
      </a>
    );
  }

  return null;
};

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

        {message.media_type && (
          <div className="pb-1">
            <MediaContent message={message} />
          </div>
        )}

        {message.content && (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}

        <div className="flex justify-end items-center text-[10px] opacity-70 pt-0.5 space-x-1">
          <span>{formatMessageTime(message.created_at)}</span>
        </div>
      </div>
    </div>
  );
};
