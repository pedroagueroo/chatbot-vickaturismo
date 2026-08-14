import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Key,
  Calendar,
  X,
  Save,
  ShieldCheck,
  ShieldAlert,
  Power
} from 'lucide-react';

export const BusinessesList = () => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    status: 'active',
    whatsapp_phone_number_id: '',
    whatsapp_access_token: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (err) {
      console.error('Error cargando empresas:', err);
      showFeedback('error', 'Error al cargar empresas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, 4000);
  };

  const openModal = (biz = null) => {
    if (biz) {
      setEditingBusiness(biz);
      setFormData({
        name: biz.name || '',
        status: biz.status || 'active',
        whatsapp_phone_number_id: biz.whatsapp_phone_number_id || '',
        whatsapp_access_token: biz.whatsapp_access_token || '',
      });
    } else {
      setEditingBusiness(null);
      setFormData({
        name: '',
        status: 'active',
        whatsapp_phone_number_id: '',
        whatsapp_access_token: '',
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBusiness(null);
  };

  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      if (editingBusiness) {
        // Actualizar empresa existente
        const { error } = await supabase
          .from('businesses')
          .update({
            name: formData.name.trim(),
            status: formData.status,
            whatsapp_phone_number_id: formData.whatsapp_phone_number_id.trim() || null,
            whatsapp_access_token: formData.whatsapp_access_token.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingBusiness.id);

        if (error) throw error;
        showFeedback('success', `Empresa "${formData.name}" actualizada con éxito.`);
      } else {
        // Crear nueva empresa (Tenant)
        const { data: newBiz, error: bizError } = await supabase
          .from('businesses')
          .insert({
            name: formData.name.trim(),
            status: formData.status,
            whatsapp_phone_number_id: formData.whatsapp_phone_number_id.trim() || null,
            whatsapp_access_token: formData.whatsapp_access_token.trim() || null,
          })
          .select()
          .single();

        if (bizError) throw bizError;

        // Inicializar bot_config básico para la nueva empresa
        if (newBiz) {
          await supabase.from('bot_config').insert({
            business_id: newBiz.id,
            agency_name: newBiz.name,
            welcome_msg: `¡Hola! Soy el asistente virtual de ${newBiz.name}. ¿En qué puedo ayudarte?`,
            out_of_hours_msg: 'En este momento estamos fuera de horario de atención.',
            bot_personality: 'Sos amigable, profesional y buscás cerrar ventas.',
            escalation_keywords: ['hablar con alguien', 'humano', 'asesor', 'agente'],
          });
        }

        showFeedback('success', `Nueva empresa "${formData.name}" registrada con éxito.`);
      }

      closeModal();
      fetchBusinesses();
    } catch (err) {
      console.error('Error guardando empresa:', err);
      showFeedback('error', 'Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (biz) => {
    const newStatus = biz.status === 'active' ? 'suspended' : 'active';
    const actionLabel = newStatus === 'active' ? 'activar' : 'suspender';

    if (!window.confirm(`¿Estás seguro de ${actionLabel} la cuenta de "${biz.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('businesses')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', biz.id);

      if (error) throw error;

      showFeedback('success', `Empresa "${biz.name}" ahora está ${newStatus === 'active' ? 'Activa' : 'Suspendida'}.`);
      fetchBusinesses();
    } catch (err) {
      console.error('Error cambiando estado:', err);
      showFeedback('error', 'Error al cambiar estado: ' + err.message);
    }
  };

  const handleDeleteBusiness = async (biz) => {
    if (
      !window.confirm(
        `¡PELIGRO! ¿Estás seguro de eliminar "${biz.name}"? Se borrarán todas sus conversaciones, mensajes y configuraciones.`
      )
    )
      return;

    try {
      const { error } = await supabase.from('businesses').delete().eq('id', biz.id);
      if (error) throw error;

      showFeedback('success', `Empresa "${biz.name}" eliminada.`);
      fetchBusinesses();
    } catch (err) {
      console.error('Error eliminando empresa:', err);
      showFeedback('error', 'Error al eliminar: ' + err.message);
    }
  };

  const filteredBusinesses = businesses.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <Building2 className="w-6 h-6 text-indigo-400" />
            <span>Gestión de Empresas SaaS (Clientes)</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Da de alta nuevas agencias de turismo, gestioná estados de suscripción y tokens de WhatsApp.
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-xl text-xs md:text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center space-x-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Empresa</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback.message && (
        <div
          className={`p-3.5 rounded-xl text-xs md:text-sm flex items-start space-x-3 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre de empresa o ID..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 pl-10 pr-4 text-xs md:text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {['ALL', 'active', 'suspended'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st === 'ALL' ? 'Todas' : st === 'active' ? 'Activas' : 'Suspendidas'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Empresas */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400 space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-xs">Cargando empresas cliente...</span>
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
          <Building2 className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
          <p className="text-sm text-slate-300 font-medium">No se encontraron empresas</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Probá ajustando el término de búsqueda.'
              : 'Hacé clic en "Nueva Empresa" para sumar tu primer cliente a la plataforma.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Empresa (Tenant)</th>
                  <th className="py-3.5 px-4">Estado Suscripción</th>
                  <th className="py-3.5 px-4">Integración WhatsApp</th>
                  <th className="py-3.5 px-4">Fecha de Alta</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredBusinesses.map((biz) => (
                  <tr key={biz.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Nombre e ID */}
                    <td className="py-4 px-4 space-y-0.5">
                      <div className="font-bold text-white flex items-center space-x-2">
                        <span>{biz.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        ID: {biz.id}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          biz.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {biz.status === 'active' ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Activo</span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Suspendido</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* WhatsApp Status */}
                    <td className="py-4 px-4">
                      {biz.whatsapp_phone_number_id ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center space-x-1 text-xs text-indigo-400 font-mono">
                            <Key className="w-3 h-3" />
                            <span>ID: {biz.whatsapp_phone_number_id}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Token: {biz.whatsapp_access_token ? 'Configurado' : 'Faltante'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Sin configurar</span>
                      )}
                    </td>

                    {/* Fecha */}
                    <td className="py-4 px-4 text-xs text-slate-400">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{new Date(biz.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          onClick={() => handleToggleStatus(biz)}
                          title={biz.status === 'active' ? 'Suspender Empresa' : 'Activar Empresa'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            biz.status === 'active'
                              ? 'text-amber-400 hover:bg-amber-500/10'
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal(biz)}
                          title="Editar Datos"
                          className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBusiness(biz)}
                          title="Eliminar Empresa"
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para Crear / Editar Empresa */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <span>{editingBusiness ? 'Editar Empresa' : 'Registrar Nueva Empresa'}</span>
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBusiness} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre Comercial de la Agencia
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Destinos Mundiales SRL"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Estado Inicial
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-100 outline-none transition-all"
                >
                  <option value="active">Activo (Acceso habilitado)</option>
                  <option value="suspended">Suspendido (Bloqueado por falta de pago)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center space-x-1.5 text-xs text-indigo-400 font-semibold">
                  <Key className="w-3.5 h-3.5" />
                  <span>Credenciales de WhatsApp Cloud API (Opcional por ahora)</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    WhatsApp Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp_phone_number_id}
                    onChange={(e) =>
                      setFormData({ ...formData, whatsapp_phone_number_id: e.target.value })
                    }
                    placeholder="Ej: 1140146155842603"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none font-mono transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Permanent Access Token de Meta
                  </label>
                  <input
                    type="password"
                    value={formData.whatsapp_access_token}
                    onChange={(e) =>
                      setFormData({ ...formData, whatsapp_access_token: e.target.value })
                    }
                    placeholder="EAAYXMG..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none font-mono transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 px-5 rounded-xl text-xs md:text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center space-x-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingBusiness ? 'Guardar Cambios' : 'Registrar Empresa'}</span>
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
