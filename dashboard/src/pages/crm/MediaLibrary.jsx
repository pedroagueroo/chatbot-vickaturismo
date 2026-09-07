import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  FolderOpen,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldAlert,
  Save,
  X,
  Image as ImageIcon,
  FileText,
  Music,
  Edit2,
} from 'lucide-react';

const ACCEPTED_FILE_TYPES = 'image/jpeg,image/png,audio/mpeg,audio/ogg,audio/aac,audio/amr,audio/mp4,application/pdf';

function mediaTypeFromMime(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'document';
  return null;
}

const MEDIA_TYPE_ICON = { image: ImageIcon, audio: Music, document: FileText };

export const MediaLibrary = () => {
  const { businessId, isSuperAdmin } = useAuth();

  const [targetBusinessId, setTargetBusinessId] = useState(businessId || null);
  const [businesses, setBusinesses] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true });
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isSuperAdmin && !businessId) {
      fetchBusinesses();
    } else if (businessId) {
      setTargetBusinessId(businessId);
    }
  }, [businessId, isSuperAdmin]);

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase.from('businesses').select('id, name').order('name');
      if (error) throw error;
      setBusinesses(data || []);
      if (data && data.length > 0 && !targetBusinessId) {
        setTargetBusinessId(data[0].id);
      }
    } catch (err) {
      console.error('Error cargando empresas:', err);
    }
  };

  useEffect(() => {
    if (!targetBusinessId) return;
    fetchItems(targetBusinessId);
  }, [targetBusinessId]);

  const fetchItems = async (bId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .eq('business_id', bId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error cargando biblioteca:', err.message);
      showFeedback('error', 'Error al cargar la biblioteca: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, message) => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  const openModal = (item = null) => {
    setSelectedFile(null);
    if (item) {
      setEditingItem(item);
      setFormData({ name: item.name, description: item.description || '', is_active: item.is_active ?? true });
    } else {
      setEditingItem(null);
      setFormData({ name: '', description: '', is_active: true });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setSelectedFile(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!mediaTypeFromMime(file.type)) {
      toast.error('Tipo de archivo no soportado. Usá foto (JPG/PNG), audio o PDF.');
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
    if (!formData.name) {
      setFormData((prev) => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, '') }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (!editingItem && !selectedFile) {
      toast.error('Seleccioná un archivo para subir.');
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('media_library')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        showFeedback('success', 'Archivo actualizado correctamente.');
      } else {
        const media_type = mediaTypeFromMime(selectedFile.type);
        const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${targetBusinessId}/library/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(path, selectedFile, { contentType: selectedFile.type, upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('chat-media').getPublicUrl(path);

        const { error } = await supabase.from('media_library').insert({
          business_id: targetBusinessId,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          media_type,
          file_url: publicUrlData.publicUrl,
          file_name: selectedFile.name,
          mime_type: selectedFile.type,
          is_active: formData.is_active,
        });

        if (error) throw error;
        showFeedback('success', 'Archivo agregado a la biblioteca.');
      }

      closeModal();
      fetchItems(targetBusinessId);
    } catch (err) {
      console.error('Error guardando archivo:', err);
      showFeedback('error', 'Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.name}" de la biblioteca?`)) return;

    try {
      const { error } = await supabase.from('media_library').delete().eq('id', item.id);
      if (error) throw error;
      showFeedback('success', 'Archivo eliminado.');
      fetchItems(targetBusinessId);
    } catch (err) {
      console.error('Error eliminando archivo:', err);
      showFeedback('error', 'Error al eliminar: ' + err.message);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      const newStatus = !item.is_active;
      const { error } = await supabase
        .from('media_library')
        .update({ is_active: newStatus })
        .eq('id', item.id);

      if (error) throw error;
      showFeedback('success', `Archivo ${newStatus ? 'activado' : 'desactivado'} correctamente.`);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active: newStatus } : i)));
    } catch (err) {
      console.error('Error cambiando estado:', err);
      showFeedback('error', 'No se pudo cambiar el estado del archivo');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold text-white flex items-center space-x-2.5">
            <FolderOpen className="w-6 h-6 text-teal-500" />
            <span>Biblioteca de Archivos</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Fotos, audios y PDFs reutilizables que el agente o la IA pueden enviar por WhatsApp.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isSuperAdmin && businesses.length > 0 && (
            <div className="flex items-center space-x-2 surface-glass rounded-md px-3 py-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <label className="text-xs text-slate-400">Empresa:</label>
              <select
                value={targetBusinessId || ''}
                onChange={(e) => setTargetBusinessId(e.target.value)}
                className="bg-slate-950/80 text-xs text-white border border-slate-700 rounded px-2 py-1 focus:outline-none focus:border-teal-600"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => openModal()}
            className="bg-teal-600 hover:bg-teal-500 text-white font-medium py-2 px-4 rounded-md text-xs md:text-sm transition-colors flex items-center space-x-2 flex-shrink-0 btn-neu"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Archivo</span>
          </button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface-glass rounded-md p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="surface-glass rounded-md p-12 text-center space-y-3">
          <FolderOpen className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
          <p className="text-sm text-slate-300 font-medium">No hay archivos en la biblioteca</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Subí fotos, audios o PDFs para que el agente los envíe rápido, o para que la IA los adjunte automáticamente cuando corresponda.
          </p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center space-x-1.5 text-xs text-teal-400 hover:text-teal-300 font-medium pt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar archivo ahora</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => {
            const Icon = MEDIA_TYPE_ICON[item.media_type] || FileText;
            return (
              <div
                key={item.id}
                className={`surface-glass rounded-md p-4 space-y-3 ${item.is_active ? '' : 'opacity-60'}`}
              >
                <div className="flex items-start gap-3">
                  {item.media_type === 'image' ? (
                    <img
                      src={item.file_url}
                      alt={item.name}
                      className="w-12 h-12 rounded object-cover border border-slate-700/50 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-teal-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-100 truncate">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                    )}
                    {!item.is_active && (
                      <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Desactivado
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-1 border-t border-slate-700/40 pt-2">
                  <button
                    onClick={() => handleToggleActive(item)}
                    title={item.is_active ? 'Desactivar' : 'Activar'}
                    className={`p-1.5 rounded transition-colors ${
                      item.is_active
                        ? 'text-emerald-400 hover:bg-emerald-500/10'
                        : 'text-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    {item.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openModal(item)}
                    title="Editar"
                    className="p-1.5 text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    title="Eliminar"
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="surface-glass rounded-md w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
              <h2 className="font-display text-base font-bold text-white flex items-center space-x-2">
                <FolderOpen className="w-5 h-5 text-teal-500" />
                <span>{editingItem ? 'Editar Archivo' : 'Nuevo Archivo'}</span>
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {!editingItem && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Archivo (foto, audio o PDF)</label>
                  <input
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    onChange={handleFileChange}
                    required
                    className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-teal-600 file:text-white file:text-xs file:font-medium hover:file:bg-teal-500 file:cursor-pointer cursor-pointer"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Folleto Paquete Cataratas"
                  required
                  className="w-full surface-well focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-md px-3.5 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descripción (ayuda a la IA a saber cuándo enviarlo)
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ej: Foto del hotel en Cataratas, usar cuando pregunten cómo es el alojamiento."
                  className="w-full surface-well focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-md p-3 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all leading-relaxed"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="is_active_checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-teal-600 focus:ring-teal-600 focus:ring-offset-slate-900"
                />
                <label htmlFor="is_active_checkbox" className="text-xs text-slate-300 select-none">
                  Habilitar para que el agente y la IA puedan enviarlo
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-md text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium py-2 px-5 rounded-md text-xs md:text-sm transition-colors flex items-center space-x-2 btn-neu"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingItem ? 'Guardar Cambios' : 'Agregar Archivo'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
