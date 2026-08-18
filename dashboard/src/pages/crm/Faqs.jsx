import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  HelpCircle,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Tag,
  ShieldAlert,
  Save,
  X
} from 'lucide-react';

export const Faqs = () => {
  const { businessId, isSuperAdmin } = useAuth();

  const [targetBusinessId, setTargetBusinessId] = useState(businessId || null);
  const [businesses, setBusinesses] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'General',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // 1. Super Admin: Cargar lista de empresas si no tiene businessId propio
  useEffect(() => {
    if (isSuperAdmin && !businessId) {
      fetchBusinesses();
    } else if (businessId) {
      setTargetBusinessId(businessId);
    }
  }, [businessId, isSuperAdmin]);

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setBusinesses(data || []);
      if (data && data.length > 0 && !targetBusinessId) {
        setTargetBusinessId(data[0].id);
      }
    } catch (err) {
      console.error('Error cargando empresas:', err);
    }
  };

  // 2. Cargar FAQs de la empresa
  useEffect(() => {
    if (!targetBusinessId) return;
    fetchFaqs(targetBusinessId);
  }, [targetBusinessId]);

  const fetchFaqs = async (bId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('business_id', bId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFaqs(data || []);
    } catch (err) {
      console.error('Error cargando FAQs:', err.message);
      showFeedback('error', 'Error al cargar FAQs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, message) => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  // Abrir Modal para crear o editar
  const openModal = (faq = null) => {
    if (faq) {
      setEditingFaq(faq);
      setFormData({
        question: faq.question,
        answer: faq.answer,
        category: faq.category || 'General',
        is_active: faq.is_active ?? true,
      });
    } else {
      setEditingFaq(null);
      setFormData({
        question: '',
        answer: '',
        category: 'General',
        is_active: true,
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingFaq(null);
  };

  // Guardar (Crear o Actualizar)
  const handleSaveFaq = async (e) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) return;

    setSaving(true);
    try {
      if (editingFaq) {
        // Actualizar
        const { error } = await supabase
          .from('faqs')
          .update({
            question: formData.question.trim(),
            answer: formData.answer.trim(),
            category: formData.category.trim() || 'General',
            is_active: formData.is_active,
          })
          .eq('id', editingFaq.id);

        if (error) throw error;
        showFeedback('success', 'Pregunta frecuente actualizada correctamente.');
      } else {
        // Crear
        const { error } = await supabase.from('faqs').insert({
          business_id: targetBusinessId,
          question: formData.question.trim(),
          answer: formData.answer.trim(),
          category: formData.category.trim() || 'General',
          is_active: formData.is_active,
        });

        if (error) throw error;
        showFeedback('success', 'Nueva pregunta frecuente creada con éxito.');
      }

      closeModal();
      fetchFaqs(targetBusinessId);
    } catch (err) {
      console.error('Error guardando FAQ:', err);
      showFeedback('error', 'Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar FAQ
  const handleDeleteFaq = async (faqId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta pregunta frecuente?')) return;

    try {
      const { error } = await supabase.from('faqs').delete().eq('id', faqId);
      if (error) throw error;
      showFeedback('success', 'Pregunta frecuente eliminada.');
      fetchFaqs(targetBusinessId);
    } catch (err) {
      console.error('Error eliminando FAQ:', err);
      showFeedback('error', 'Error al eliminar: ' + err.message);
    }
  };

  // Alternar estado activo/inactivo
  const handleToggleActive = async (faq) => {
    try {
      const newStatus = !faq.is_active;
      const { error } = await supabase
        .from('faqs')
        .update({ is_active: newStatus })
        .eq('id', faq.id);

      if (error) throw error;

      showFeedback('success', `FAQ ${newStatus ? 'activada' : 'desactivada'} correctamente.`);
      setFaqs((prev) =>
        prev.map((item) => (item.id === faq.id ? { ...item, is_active: newStatus } : item))
      );
    } catch (err) {
      console.error('Error cambiando estado:', err);
      showFeedback('error', 'No se pudo cambiar el estado de la FAQ');
    }
  };

  // Categorías únicas para filtro
  const categories = ['ALL', ...new Set(faqs.map((f) => f.category || 'General'))];

  // FAQs filtradas por búsqueda y categoría
  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'ALL' || (faq.category || 'General') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center space-x-2.5">
            <HelpCircle className="w-6 h-6 text-indigo-400" />
            <span>Preguntas Frecuentes (Knowledge Base)</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Entrená a la IA con respuestas oficiales sobre paquetes, pagos y políticas de la empresa.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Selector de empresa si es Super Admin */}
          {isSuperAdmin && businesses.length > 0 && (
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <label className="text-xs text-slate-400">Empresa:</label>
              <select
                value={targetBusinessId || ''}
                onChange={(e) => setTargetBusinessId(e.target.value)}
                className="bg-slate-950 text-xs text-white border border-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-xl text-xs md:text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center space-x-2 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva FAQ</span>
          </button>
        </div>
      </div>



      {/* Filtros & Barra de Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por pregunta o respuesta..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 pl-10 pr-4 text-xs md:text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
          />
        </div>

        {/* Categorías Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat === 'ALL' ? 'Todas' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de FAQs */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400 space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-xs">Cargando base de conocimiento...</span>
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
          <HelpCircle className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
          <p className="text-sm text-slate-300 font-medium">No se encontraron preguntas frecuentes</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Probá ajustando los términos de búsqueda o cambiando de categoría.'
              : 'Agregá tu primera pregunta para que Claude sepa cómo responderle a tus clientes.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => openModal()}
              className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium pt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear FAQ ahora</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((faq) => (
            <div
              key={faq.id}
              className={`bg-slate-900/80 border rounded-2xl p-4 md:p-5 transition-all space-y-3 shadow-md ${
                faq.is_active
                  ? 'border-slate-800 hover:border-slate-700/80'
                  : 'border-slate-800/40 opacity-60 bg-slate-950/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Tag className="w-2.5 h-2.5" />
                      <span>{faq.category || 'General'}</span>
                    </span>
                    {!faq.is_active && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Desactivada
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">{faq.question}</h3>
                </div>

                {/* Acciones */}
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(faq)}
                    title={faq.is_active ? 'Desactivar FAQ' : 'Activar FAQ'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      faq.is_active
                        ? 'text-emerald-400 hover:bg-emerald-500/10'
                        : 'text-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    {faq.is_active ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => openModal(faq)}
                    title="Editar FAQ"
                    className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFaq(faq.id)}
                    title="Eliminar FAQ"
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Respuesta */}
              <p className="text-xs md:text-sm text-slate-300 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60 leading-relaxed whitespace-pre-wrap">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Crear / Editar FAQ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                <span>{editingFaq ? 'Editar Pregunta Frecuente' : 'Nueva Pregunta Frecuente'}</span>
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Categoría
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ej: Pagos, Destinos, Documentación, Políticas"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Pregunta que suele hacer el cliente
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Ej: ¿Cuáles son las formas de pago disponibles?"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Respuesta oficial que debe dar la IA
                </label>
                <textarea
                  rows={4}
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Ej: Aceptamos transferencias bancarias y tarjetas en hasta 6 cuotas fijas..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all leading-relaxed"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="is_active_checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                />
                <label htmlFor="is_active_checkbox" className="text-xs text-slate-300 select-none">
                  Habilitar esta pregunta para que Claude la use de inmediato
                </label>
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
                      <span>{editingFaq ? 'Guardar Cambios' : 'Crear FAQ'}</span>
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
