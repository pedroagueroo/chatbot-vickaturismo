import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  FolderOpen,
  Folder,
  FolderPlus,
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
  ChevronRight,
  Home,
  Move,
  AlertTriangle,
  Trash,
  RotateCcw,
  Clock,
} from 'lucide-react';

const ACCEPTED_FILE_TYPES = 'image/jpeg,image/png,audio/mpeg,audio/ogg,audio/aac,audio/amr,audio/mp4,application/pdf';
const TRASH_RETENTION_HOURS = 72;

function mediaTypeFromMime(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'document';
  return null;
}

// Los file_url son links públicos tipo .../object/public/chat-media/<path>; necesitamos
// el <path> solo para poder borrar el objeto real del bucket cuando se purga la papelera.
function extractStoragePath(fileUrl) {
  const marker = '/chat-media/';
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return fileUrl.substring(idx + marker.length);
}

function hoursUntilPurge(deletedAt) {
  const deletedMs = new Date(deletedAt).getTime();
  const purgeMs = deletedMs + TRASH_RETENTION_HOURS * 60 * 60 * 1000;
  const remainingHours = Math.max(0, Math.ceil((purgeMs - Date.now()) / (60 * 60 * 1000)));
  return remainingHours;
}

const MEDIA_TYPE_ICON = { image: ImageIcon, audio: Music, document: FileText };

export const MediaLibrary = () => {
  const { businessId, isSuperAdmin } = useAuth();

  const [targetBusinessId, setTargetBusinessId] = useState(businessId || null);
  const [businesses, setBusinesses] = useState([]);

  // Navegación de carpetas
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]); // [{ id, name }]
  const [folders, setFolders] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal: Nueva/Editar carpeta
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [savingFolder, setSavingFolder] = useState(false);

  // Modal: Nuevo/Editar archivo
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true });
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);

  // Modal: Mover archivo o carpeta
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [movingItem, setMovingItem] = useState(null); // { id, name }
  const [movingType, setMovingType] = useState(null); // 'file' | 'folder'
  const [excludedFolderIds, setExcludedFolderIds] = useState(new Set()); // carpeta que se mueve + sus descendientes (no se puede mover ahí adentro)
  const [pickerFolderId, setPickerFolderId] = useState(null);
  const [pickerBreadcrumb, setPickerBreadcrumb] = useState([]); // [{ id, name }]
  const [pickerFolders, setPickerFolders] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [moving, setMoving] = useState(false);

  // Modal de confirmación genérico (reemplaza window.confirm)
  const [confirmState, setConfirmState] = useState(null); // { title, message, confirmLabel, action }
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Papelera
  const [trashView, setTrashView] = useState(false);
  const [trashItems, setTrashItems] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);

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
    fetchFolderContents(targetBusinessId, currentFolderId);
  }, [targetBusinessId, currentFolderId]);

  const fetchFolderContents = async (bId, folderId) => {
    setLoading(true);
    try {
      let folderQuery = supabase.from('media_folders').select('*').eq('business_id', bId).order('name');
      folderQuery = folderId ? folderQuery.eq('parent_folder_id', folderId) : folderQuery.is('parent_folder_id', null);

      let itemsQuery = supabase
        .from('media_library')
        .select('*')
        .eq('business_id', bId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      itemsQuery = folderId ? itemsQuery.eq('folder_id', folderId) : itemsQuery.is('folder_id', null);

      const [{ data: folderData, error: folderError }, { data: itemData, error: itemError }] = await Promise.all([
        folderQuery,
        itemsQuery,
      ]);

      if (folderError) throw folderError;
      if (itemError) throw itemError;

      setFolders(folderData || []);
      setItems(itemData || []);
    } catch (err) {
      console.error('Error cargando la biblioteca:', err.message);
      showFeedback('error', 'Error al cargar la biblioteca: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => fetchFolderContents(targetBusinessId, currentFolderId);

  const showFeedback = (type, message) => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  // ------------------ Navegación ------------------

  const openFolder = (folder) => {
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
  };

  const goToBreadcrumb = (index) => {
    if (index === -1) {
      setBreadcrumb([]);
      setCurrentFolderId(null);
      return;
    }
    const newCrumb = breadcrumb.slice(0, index + 1);
    setBreadcrumb(newCrumb);
    setCurrentFolderId(newCrumb[newCrumb.length - 1].id);
  };

  // ------------------ Carpetas ------------------

  const openFolderModal = (folder = null) => {
    setEditingFolder(folder);
    setFolderName(folder ? folder.name : '');
    setFolderModalOpen(true);
  };

  const closeFolderModal = () => {
    setFolderModalOpen(false);
    setEditingFolder(null);
    setFolderName('');
  };

  const handleSaveFolder = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setSavingFolder(true);
    try {
      if (editingFolder) {
        const { error } = await supabase
          .from('media_folders')
          .update({ name: folderName.trim() })
          .eq('id', editingFolder.id);
        if (error) throw error;
        showFeedback('success', 'Carpeta renombrada.');
      } else {
        const { error } = await supabase.from('media_folders').insert({
          business_id: targetBusinessId,
          parent_folder_id: currentFolderId,
          name: folderName.trim(),
        });
        if (error) throw error;
        showFeedback('success', 'Carpeta creada.');
      }
      closeFolderModal();
      refresh();
    } catch (err) {
      console.error('Error guardando carpeta:', err);
      showFeedback('error', 'Error al guardar la carpeta: ' + err.message);
    } finally {
      setSavingFolder(false);
    }
  };

  const requestDeleteFolder = (folder) => {
    setConfirmState({
      title: 'Eliminar carpeta',
      message: `¿Eliminar la carpeta "${folder.name}"? Las subcarpetas dentro también se eliminan, pero los archivos NO se borran: quedan sueltos en la raíz.`,
      confirmLabel: 'Eliminar carpeta',
      action: async () => {
        const { error } = await supabase.from('media_folders').delete().eq('id', folder.id);
        if (error) throw error;
        showFeedback('success', 'Carpeta eliminada.');
        refresh();
      },
    });
  };

  // ------------------ Mover (archivos y carpetas) ------------------

  // Recorre recursivamente las subcarpetas de una carpeta para armar la lista de destinos prohibidos
  // (no se puede mover una carpeta dentro de sí misma ni de ninguna de sus propias subcarpetas).
  const getDescendantFolderIds = async (folderId) => {
    const ids = new Set([folderId]);
    const queue = [folderId];
    while (queue.length > 0) {
      const current = queue.shift();
      const { data } = await supabase.from('media_folders').select('id').eq('parent_folder_id', current);
      (data || []).forEach((f) => {
        ids.add(f.id);
        queue.push(f.id);
      });
    }
    return ids;
  };

  const fetchPickerLevel = async (folderId, excluded) => {
    setPickerLoading(true);
    try {
      let query = supabase.from('media_folders').select('*').eq('business_id', targetBusinessId).order('name');
      query = folderId ? query.eq('parent_folder_id', folderId) : query.is('parent_folder_id', null);
      const { data, error } = await query;
      if (error) throw error;
      const visible = (data || []).filter((f) => !excluded.has(f.id));
      setPickerFolders(visible);
    } catch (err) {
      console.error('Error cargando carpetas:', err);
      showFeedback('error', 'No se pudieron cargar las carpetas');
    } finally {
      setPickerLoading(false);
    }
  };

  const openMoveModal = async (item, type) => {
    setMovingItem(item);
    setMovingType(type);
    setPickerFolderId(null);
    setPickerBreadcrumb([]);
    setMoveModalOpen(true);

    const excluded = type === 'folder' ? await getDescendantFolderIds(item.id) : new Set();
    setExcludedFolderIds(excluded);
    await fetchPickerLevel(null, excluded);
  };

  const closeMoveModal = () => {
    setMoveModalOpen(false);
    setMovingItem(null);
    setMovingType(null);
  };

  const openPickerFolder = async (folder) => {
    setPickerBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setPickerFolderId(folder.id);
    await fetchPickerLevel(folder.id, excludedFolderIds);
  };

  const goToPickerBreadcrumb = async (index) => {
    if (index === -1) {
      setPickerBreadcrumb([]);
      setPickerFolderId(null);
      await fetchPickerLevel(null, excludedFolderIds);
      return;
    }
    const newCrumb = pickerBreadcrumb.slice(0, index + 1);
    const targetId = newCrumb[newCrumb.length - 1].id;
    setPickerBreadcrumb(newCrumb);
    setPickerFolderId(targetId);
    await fetchPickerLevel(targetId, excludedFolderIds);
  };

  const handleConfirmMove = async () => {
    if (!movingItem || !movingType) return;

    setMoving(true);
    try {
      if (movingType === 'file') {
        const { error } = await supabase
          .from('media_library')
          .update({ folder_id: pickerFolderId })
          .eq('id', movingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('media_folders')
          .update({ parent_folder_id: pickerFolderId })
          .eq('id', movingItem.id);
        if (error) throw error;
      }
      showFeedback('success', `"${movingItem.name}" movido correctamente.`);
      closeMoveModal();
      refresh();
    } catch (err) {
      console.error('Error moviendo:', err);
      showFeedback('error', 'Error al mover: ' + err.message);
    } finally {
      setMoving(false);
    }
  };

  // ------------------ Archivos ------------------

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
          folder_id: currentFolderId,
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
      refresh();
    } catch (err) {
      console.error('Error guardando archivo:', err);
      showFeedback('error', 'Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteItem = (item) => {
    setConfirmState({
      title: 'Mover a la papelera',
      message: `"${item.name}" se va a mover a la papelera y se eliminará definitivamente en ${TRASH_RETENTION_HOURS} horas. Podés restaurarlo antes desde la Papelera.`,
      confirmLabel: 'Mover a la papelera',
      action: async () => {
        const { error } = await supabase
          .from('media_library')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', item.id);
        if (error) throw error;
        showFeedback('success', 'Archivo movido a la papelera.');
        refresh();
      },
    });
  };

  // ------------------ Papelera ------------------

  const fetchTrash = async () => {
    setTrashLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .eq('business_id', targetBusinessId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: true });
      if (error) throw error;
      setTrashItems(data || []);
    } catch (err) {
      console.error('Error cargando la papelera:', err);
      showFeedback('error', 'Error al cargar la papelera: ' + err.message);
    } finally {
      setTrashLoading(false);
    }
  };

  const openTrash = async () => {
    setTrashView(true);
    await fetchTrash();
  };

  const closeTrash = () => {
    setTrashView(false);
  };

  const handleRestore = async (item) => {
    try {
      const { error } = await supabase
        .from('media_library')
        .update({ deleted_at: null })
        .eq('id', item.id);
      if (error) throw error;
      showFeedback('success', `"${item.name}" restaurado.`);
      fetchTrash();
    } catch (err) {
      console.error('Error restaurando archivo:', err);
      showFeedback('error', 'Error al restaurar: ' + err.message);
    }
  };

  const requestPermanentDelete = (item) => {
    setConfirmState({
      title: 'Eliminar definitivamente',
      message: `"${item.name}" se va a borrar para siempre ahora mismo (no se puede deshacer). ¿Continuar?`,
      confirmLabel: 'Eliminar para siempre',
      action: async () => {
        const path = extractStoragePath(item.file_url);
        if (path) {
          const { error: storageError } = await supabase.storage.from('chat-media').remove([path]);
          if (storageError) console.error('Error borrando del storage:', storageError);
        }
        const { error } = await supabase.from('media_library').delete().eq('id', item.id);
        if (error) throw error;
        showFeedback('success', 'Archivo eliminado definitivamente.');
        fetchTrash();
      },
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmState) return;
    setConfirmLoading(true);
    try {
      await confirmState.action();
      setConfirmState(null);
    } catch (err) {
      console.error('Error ejecutando acción:', err);
      showFeedback('error', 'Ocurrió un error: ' + err.message);
    } finally {
      setConfirmLoading(false);
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

  const isEmpty = !loading && folders.length === 0 && items.length === 0;

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

        <div className="flex items-center flex-wrap gap-2">
          {isSuperAdmin && businesses.length > 0 && (
            <div className="flex items-center space-x-2 surface-glass rounded-md px-3 py-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <label className="text-xs text-slate-400">Empresa:</label>
              <select
                value={targetBusinessId || ''}
                onChange={(e) => {
                  setTargetBusinessId(e.target.value);
                  setCurrentFolderId(null);
                  setBreadcrumb([]);
                }}
                className="bg-slate-950/80 text-xs text-white border border-slate-700 rounded px-2 py-1 focus:outline-none focus:border-teal-600 max-w-[150px] sm:max-w-[220px]"
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
            onClick={trashView ? closeTrash : openTrash}
            className={`font-medium py-2 px-3.5 rounded-md text-xs md:text-sm transition-colors flex items-center space-x-2 flex-shrink-0 btn-neu ${
              trashView
                ? 'bg-teal-600 hover:bg-teal-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
            }`}
          >
            <Trash className="w-4 h-4" />
            <span>{trashView ? 'Volver a la Biblioteca' : 'Papelera'}</span>
          </button>

          {!trashView && (
            <>
              <button
                onClick={() => openFolderModal()}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium py-2 px-3.5 rounded-md text-xs md:text-sm transition-colors flex items-center space-x-2 flex-shrink-0 btn-neu"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Nueva Carpeta</span>
              </button>

              <button
                onClick={() => openModal()}
                className="bg-teal-600 hover:bg-teal-500 text-white font-medium py-2 px-4 rounded-md text-xs md:text-sm transition-colors flex items-center space-x-2 flex-shrink-0 btn-neu"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Archivo</span>
              </button>
            </>
          )}
        </div>
      </div>

      {trashView ? (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Los archivos acá se eliminan definitivamente {TRASH_RETENTION_HOURS} horas después de borrarlos. Podés restaurarlos antes de que se cumpla el plazo.
          </p>

          {trashLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[0, 1].map((i) => (
                <div key={i} className="surface-glass rounded-md p-5 h-28 animate-pulse" />
              ))}
            </div>
          ) : trashItems.length === 0 ? (
            <div className="surface-glass rounded-md p-12 text-center space-y-3">
              <Trash className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
              <p className="text-sm text-slate-300 font-medium">La papelera está vacía</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {trashItems.map((item) => {
                const Icon = MEDIA_TYPE_ICON[item.media_type] || FileText;
                const hoursLeft = hoursUntilPurge(item.deleted_at);
                return (
                  <div key={item.id} className="surface-glass rounded-md p-4 space-y-3 opacity-80">
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
                        <span className="inline-flex items-center space-x-1 text-[10px] text-amber-400 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {hoursLeft > 0
                              ? `Se elimina en ${hoursLeft}h`
                              : 'Se elimina en la próxima purga'}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-1 border-t border-slate-700/40 pt-2">
                      <button
                        onClick={() => handleRestore(item)}
                        title="Restaurar"
                        className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => requestPermanentDelete(item)}
                        title="Eliminar para siempre"
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
        </div>
      ) : (
        <>
      {/* Breadcrumb */}
      <div className="flex items-center flex-wrap gap-1 text-xs">
        <button
          onClick={() => goToBreadcrumb(-1)}
          className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
            currentFolderId === null ? 'text-teal-400 font-semibold' : 'text-slate-400 hover:text-teal-300 hover:bg-slate-800'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>Biblioteca</span>
        </button>
        {breadcrumb.map((crumb, index) => (
          <React.Fragment key={crumb.id}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <button
              onClick={() => goToBreadcrumb(index)}
              className={`px-2 py-1 rounded transition-colors ${
                index === breadcrumb.length - 1
                  ? 'text-teal-400 font-semibold'
                  : 'text-slate-400 hover:text-teal-300 hover:bg-slate-800'
              }`}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface-glass rounded-md p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="surface-glass rounded-md p-12 text-center space-y-3">
          <FolderOpen className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
          <p className="text-sm text-slate-300 font-medium">Esta carpeta está vacía</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Creá una subcarpeta para seguir organizando, o subí fotos, audios o PDFs para que el agente y la IA los envíen por WhatsApp.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Carpetas */}
          {folders.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="surface-glass rounded-md p-4 flex items-center gap-3 group hover:border-teal-600/50 border border-transparent transition-colors"
                >
                  <button
                    onClick={() => openFolder(folder)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="w-10 h-10 rounded bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                      <Folder className="w-5 h-5 text-teal-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-100 truncate">{folder.name}</span>
                  </button>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => openMoveModal(folder, 'folder')}
                      title="Mover"
                      className="p-1.5 text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 rounded transition-colors"
                    >
                      <Move className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openFolderModal(folder)}
                      title="Renombrar"
                      className="p-1.5 text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 rounded transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => requestDeleteFolder(folder)}
                      title="Eliminar carpeta"
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Archivos */}
          {items.length > 0 && (
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
                        onClick={() => openMoveModal(item, 'file')}
                        title="Mover"
                        className="p-1.5 text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 rounded transition-colors"
                      >
                        <Move className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal(item)}
                        title="Editar"
                        className="p-1.5 text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => requestDeleteItem(item)}
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
        </div>
      )}
        </>
      )}

      {/* Modal Nueva/Editar Carpeta */}
      {folderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="surface-glass rounded-md w-full max-w-sm p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
              <h2 className="font-display text-base font-bold text-white flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-teal-500" />
                <span>{editingFolder ? 'Renombrar Carpeta' : 'Nueva Carpeta'}</span>
              </h2>
              <button
                onClick={closeFolderModal}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nombre de la carpeta</label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Ej: El Caribe"
                  autoFocus
                  required
                  className="w-full surface-well focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-md px-3.5 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={closeFolderModal}
                  className="px-4 py-2 rounded-md text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingFolder}
                  className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium py-2 px-5 rounded-md text-xs md:text-sm transition-colors flex items-center space-x-2 btn-neu"
                >
                  {savingFolder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingFolder ? 'Guardar' : 'Crear'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Archivo */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="surface-glass rounded-md w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
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

            {!editingItem && (
              <p className="text-[11px] text-slate-500 -mt-2">
                Se va a guardar en:{' '}
                <span className="text-teal-400 font-medium">
                  {breadcrumb.length === 0 ? 'Biblioteca (raíz)' : breadcrumb.map((c) => c.name).join(' / ')}
                </span>
              </p>
            )}

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

      {/* Modal Mover archivo/carpeta */}
      {moveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="surface-glass rounded-md w-full max-w-md p-5 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3 flex-shrink-0">
              <h2 className="font-display text-sm font-bold text-white flex items-center space-x-2">
                <Move className="w-4 h-4 text-teal-500" />
                <span>Mover "{movingItem?.name}"</span>
              </h2>
              <button
                onClick={closeMoveModal}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Breadcrumb del selector */}
            <div className="flex items-center flex-wrap gap-1 text-[11px] flex-shrink-0">
              <button
                onClick={() => goToPickerBreadcrumb(-1)}
                className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition-colors ${
                  pickerFolderId === null ? 'text-teal-400 font-semibold' : 'text-slate-400 hover:text-teal-300 hover:bg-slate-800'
                }`}
              >
                <Home className="w-3 h-3" />
                <span>Biblioteca</span>
              </button>
              {pickerBreadcrumb.map((crumb, index) => (
                <React.Fragment key={crumb.id}>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <button
                    onClick={() => goToPickerBreadcrumb(index)}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      index === pickerBreadcrumb.length - 1
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
              {pickerLoading ? (
                <div className="text-center py-8 text-slate-500 text-xs">Cargando...</div>
              ) : pickerFolders.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No hay subcarpetas acá.</div>
              ) : (
                pickerFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => openPickerFolder(folder)}
                    className="w-full text-left flex items-center space-x-3 p-2.5 rounded-md border border-slate-700/40 hover:border-teal-600 hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="w-9 h-9 rounded bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                      <Folder className="w-4 h-4 text-teal-400" />
                    </div>
                    <p className="text-xs font-semibold text-slate-100 truncate">{folder.name}</p>
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-700/50 flex-shrink-0">
              <button
                type="button"
                onClick={closeMoveModal}
                className="px-4 py-2 rounded-md text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMove}
                disabled={moving}
                className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium py-2 px-5 rounded-md text-xs md:text-sm transition-colors flex items-center space-x-2 btn-neu"
              >
                {moving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Move className="w-4 h-4" />}
                <span>
                  Mover aquí{pickerBreadcrumb.length > 0 ? ` (${pickerBreadcrumb[pickerBreadcrumb.length - 1].name})` : ' (raíz)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación (eliminar carpeta / archivo) */}
      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="surface-glass rounded-md w-full max-w-sm p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div className="space-y-1 pt-1">
                <h2 className="font-display text-sm font-bold text-white">{confirmState.title}</h2>
                <p className="text-xs text-slate-400 leading-relaxed">{confirmState.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-700/50">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                disabled={confirmLoading}
                className="px-4 py-2 rounded-md text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={confirmLoading}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium py-2 px-5 rounded-md text-xs md:text-sm transition-colors flex items-center space-x-2 btn-neu"
              >
                {confirmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{confirmState.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
