import React, { useState, useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { Send, UserCheck, Bot, Phone, Paperclip, Image, FileText, Loader2, X, Folder, ChevronRight, Home } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

// Distancia (px) al final del scroll dentro de la cual consideramos que el usuario
// "está al pie" del chat y por lo tanto es seguro autoscrollear ante nuevos mensajes.
const AUTO_SCROLL_THRESHOLD = 120;

// Tipos de archivo aceptados para adjuntar (deben coincidir con allowed_mime_types del bucket chat-media)
const ACCEPTED_FILE_TYPES = 'image/jpeg,image/png,audio/mpeg,audio/ogg,audio/aac,audio/amr,audio/mp4,application/pdf';

function mediaTypeFromMime(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'document';
  return null;
}

export const ChatWindow = ({ conversation, messages, onToggleEscalate }) => {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryFolders, setLibraryFolders] = useState([]);
  const [libraryItems, setLibraryItems] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryFolderId, setLibraryFolderId] = useState(null);
  const [libraryBreadcrumb, setLibraryBreadcrumb] = useState([]); // [{ id, name }]
  const fileInputRef = useRef(null);
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

  const sendMedia = async ({ media_url, media_type, file_name }) => {
    const caption = inputText.trim();
    setInputText('');

    try {
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          conversation_id: conversation.id,
          content: caption,
          media_url,
          media_type,
          file_name,
        },
      });

      if (error) throw error;

      if (data?.error) {
        console.error('Error desde Edge Function:', data.error, data.details);
        toast.error(`Error al enviar archivo: ${data.error}`);
      } else {
        toast.success('Archivo enviado a WhatsApp');
      }

      if (!isEscalated) {
        await onToggleEscalate(conversation.id, 'escalated');
      }
    } catch (err) {
      console.error('Error enviando archivo:', err);
      toast.error(`Error de conexión al enviar: ${err.message || 'Error desconocido'}`);
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-seleccionar el mismo archivo más adelante
    if (!file) return;

    const media_type = mediaTypeFromMime(file.type);
    if (!media_type) {
      toast.error('Tipo de archivo no soportado. Usá foto (JPG/PNG), audio o PDF.');
      return;
    }

    setAttachMenuOpen(false);
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${conversation.business_id}/uploads/${conversation.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('chat-media').getPublicUrl(path);

      await sendMedia({
        media_url: publicUrlData.publicUrl,
        media_type,
        file_name: file.name,
      });
    } catch (err) {
      console.error('Error subiendo archivo:', err);
      toast.error(`Error al subir archivo: ${err.message || 'Error desconocido'}`);
    } finally {
      setUploading(false);
    }
  };

  const fetchLibraryFolder = async (folderId) => {
    setLibraryLoading(true);
    try {
      let folderQuery = supabase
        .from('media_folders')
        .select('*')
        .eq('business_id', conversation.business_id)
        .order('name');
      folderQuery = folderId ? folderQuery.eq('parent_folder_id', folderId) : folderQuery.is('parent_folder_id', null);

      let itemsQuery = supabase
        .from('media_library')
        .select('*')
        .eq('business_id', conversation.business_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');
      itemsQuery = folderId ? itemsQuery.eq('folder_id', folderId) : itemsQuery.is('folder_id', null);

      const [{ data: folderData, error: folderError }, { data: itemData, error: itemError }] = await Promise.all([
        folderQuery,
        itemsQuery,
      ]);

      if (folderError) throw folderError;
      if (itemError) throw itemError;

      setLibraryFolders(folderData || []);
      setLibraryItems(itemData || []);
    } catch (err) {
      console.error('Error cargando biblioteca de archivos:', err);
      toast.error('No se pudo cargar la biblioteca de archivos');
    } finally {
      setLibraryLoading(false);
    }
  };

  const openLibrary = async () => {
    setAttachMenuOpen(false);
    setLibraryOpen(true);
    setLibraryFolderId(null);
    setLibraryBreadcrumb([]);
    await fetchLibraryFolder(null);
  };

  const openLibrarySubfolder = async (folder) => {
    setLibraryBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setLibraryFolderId(folder.id);
    await fetchLibraryFolder(folder.id);
  };

  const goToLibraryBreadcrumb = async (index) => {
    if (index === -1) {
      setLibraryBreadcrumb([]);
      setLibraryFolderId(null);
      await fetchLibraryFolder(null);
      return;
    }
    const newCrumb = libraryBreadcrumb.slice(0, index + 1);
    const targetId = newCrumb[newCrumb.length - 1].id;
    setLibraryBreadcrumb(newCrumb);
    setLibraryFolderId(targetId);
    await fetchLibraryFolder(targetId);
  };

  const handlePickLibraryItem = async (item) => {
    setLibraryOpen(false);
    await sendMedia({
      media_url: item.file_url,
      media_type: item.media_type,
      file_name: item.file_name,
    });
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
        className="p-3 border-t border-slate-700/50 flex items-center space-x-2 flex-shrink-0 relative"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileSelected}
          className="hidden"
        />

        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setAttachMenuOpen((open) => !open)}
            disabled={uploading}
            title="Adjuntar foto, audio o PDF"
            className="p-2.5 text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 disabled:opacity-40 rounded-md transition-colors btn-neu"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </button>

          {attachMenuOpen && (
            <div className="absolute bottom-full mb-2 left-0 w-56 surface-glass rounded-md border border-slate-700/50 shadow-lg overflow-hidden z-20">
              <button
                type="button"
                onClick={() => {
                  setAttachMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center space-x-2 px-3.5 py-2.5 text-xs text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <Image className="w-3.5 h-3.5 text-teal-400" />
                <span>Subir foto, audio o PDF</span>
              </button>
              <button
                type="button"
                onClick={openLibrary}
                className="w-full flex items-center space-x-2 px-3.5 py-2.5 text-xs text-slate-200 hover:bg-slate-800 transition-colors border-t border-slate-700/50"
              >
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                <span>Elegir de la biblioteca</span>
              </button>
            </div>
          )}
        </div>

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

      {/* Modal: Elegir archivo de la Biblioteca */}
      {libraryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="surface-glass rounded-md w-full max-w-md p-5 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3 flex-shrink-0">
              <h2 className="font-display text-sm font-bold text-white flex items-center space-x-2">
                <FileText className="w-4 h-4 text-teal-500" />
                <span>Elegir de la Biblioteca</span>
              </h2>
              <button
                onClick={() => setLibraryOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Breadcrumb */}
            <div className="flex items-center flex-wrap gap-1 text-[11px] flex-shrink-0 -mt-1">
              <button
                onClick={() => goToLibraryBreadcrumb(-1)}
                className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition-colors ${
                  libraryFolderId === null ? 'text-teal-400 font-semibold' : 'text-slate-400 hover:text-teal-300 hover:bg-slate-800'
                }`}
              >
                <Home className="w-3 h-3" />
                <span>Biblioteca</span>
              </button>
              {libraryBreadcrumb.map((crumb, index) => (
                <React.Fragment key={crumb.id}>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <button
                    onClick={() => goToLibraryBreadcrumb(index)}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      index === libraryBreadcrumb.length - 1
                        ? 'text-teal-400 font-semibold'
                        : 'text-slate-400 hover:text-teal-300 hover:bg-slate-800'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
              {libraryLoading ? (
                <div className="text-center py-8 text-slate-500 text-xs">Cargando...</div>
              ) : libraryFolders.length === 0 && libraryItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Esta carpeta está vacía. Agregá contenido desde "Biblioteca de Archivos" en el menú.
                </div>
              ) : (
                <>
                  {libraryFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => openLibrarySubfolder(folder)}
                      className="w-full text-left flex items-center space-x-3 p-2.5 rounded-md border border-slate-700/40 hover:border-teal-600 hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="w-9 h-9 rounded bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                        <Folder className="w-4 h-4 text-teal-400" />
                      </div>
                      <p className="text-xs font-semibold text-slate-100 truncate">{folder.name}</p>
                    </button>
                  ))}
                  {libraryItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handlePickLibraryItem(item)}
                      className="w-full text-left flex items-center space-x-3 p-2.5 rounded-md border border-slate-700/40 hover:border-teal-600 hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="w-9 h-9 rounded bg-slate-800 flex items-center justify-center flex-shrink-0">
                        {item.media_type === 'image' ? (
                          <Image className="w-4 h-4 text-teal-400" />
                        ) : (
                          <FileText className="w-4 h-4 text-teal-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-100 truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 truncate">{item.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
