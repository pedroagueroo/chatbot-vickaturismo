import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import {
  User,
  Phone,
  Mail,
  CreditCard,
  FileText,
  Save,
  Check,
  Sparkles,
  Tag,
  AlertCircle
} from 'lucide-react';

const QUICK_TAGS = [
  '✈️ Prefiere Ventana',
  '🏨 Hoteles 4/5★',
  '👨‍👩‍👧‍👦 Viaje Familiar',
  '🎒 Aventura/Mochilero',
  '💳 Presupuesto Alto',
  '⭐ Cliente Frecuente',
  '🌴 Destinos Playa',
];

export const CustomerProfile = ({ customer, onCustomerUpdate }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sincronizar estado local cuando cambia el cliente seleccionado
  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
      setDni(customer.dni || '');
      setNotes(customer.notes || '');
      setSavedSuccess(false);
      setErrorMsg('');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setDni('');
      setNotes('');
    }
  }, [customer]);

  if (!customer) {
    return (
      <div className="h-full flex flex-col justify-center items-center text-slate-500 p-6 text-center space-y-3">
        <User className="w-10 h-10 text-slate-600 opacity-40" />
        <p className="text-xs font-medium">Selecciona un chat para ver y editar los datos del cliente</p>
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    if (!customer?.id || saving) return;

    setSaving(true);
    setErrorMsg('');
    setSavedSuccess(false);

    try {
      const updateData = {
        name: name.trim(),
        email: email.trim() || null,
        dni: dni.trim() || null,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customer.id)
        .select()
        .single();

      if (error) throw error;

      setSavedSuccess(true);
      toast.success('Ficha CRM actualizada correctamente');
      if (onCustomerUpdate) {
        onCustomerUpdate(data);
      }

      setTimeout(() => {
        setSavedSuccess(false);
      }, 2500);
    } catch (err) {
      console.error('Error guardando perfil del cliente:', err);
      setErrorMsg(err.message || 'Error al guardar');
      toast.error('Error al guardar ficha: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = (tag) => {
    if (notes.includes(tag)) return;
    const separator = notes.trim().length > 0 ? '\n' : '';
    setNotes((prev) => `${prev.trim()}${separator}• ${tag}`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/95 border-l border-slate-800 text-slate-200 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Ficha del Cliente
            </h3>
            <p className="text-[10px] text-slate-400">CRM & Memoria IA</p>
          </div>
        </div>

        {/* AI Memory Badge */}
        <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-medium" title="La IA leerá estas notas en sus próximas respuestas">
          <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
          <span>Sync con IA</span>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSave} className="p-4 space-y-4 flex-1 flex flex-col">
        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Nombre */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1.5">
            <User className="w-3 h-3 text-slate-500" />
            <span>Nombre Completo</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Pedro Agüero"
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-all"
          />
        </div>

        {/* Teléfono */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1.5">
            <Phone className="w-3 h-3 text-slate-500" />
            <span>WhatsApp / Teléfono</span>
          </label>
          <input
            type="text"
            value={phone}
            disabled
            className="w-full bg-slate-950/40 border border-slate-800/60 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono cursor-not-allowed opacity-80"
          />
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1.5">
            <Mail className="w-3 h-3 text-slate-500" />
            <span>Correo Electrónico</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ejemplo@correo.com"
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-all"
          />
        </div>

        {/* DNI / Pasaporte */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1.5">
            <CreditCard className="w-3 h-3 text-slate-500" />
            <span>DNI / Pasaporte</span>
          </label>
          <input
            type="text"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="Ej: 42123456 / AAB123456"
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-all"
          />
        </div>

        {/* Notas Internas y Preferencias */}
        <div className="space-y-1.5 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1.5">
              <FileText className="w-3 h-3 text-indigo-400" />
              <span>Notas & Preferencias (IA Context)</span>
            </label>
            <span className="text-[10px] text-slate-500">Visible para el bot</span>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Viaja siempre con su familia. Prefiere hoteles con pensión completa. Destino favorito: Brasil."
            rows={4}
            className="w-full flex-1 min-h-[100px] bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 outline-none resize-none leading-relaxed transition-all"
          />

          {/* Quick Tags */}
          <div className="pt-1">
            <div className="text-[10px] font-medium text-slate-500 mb-1.5 flex items-center space-x-1">
              <Tag className="w-2.5 h-2.5" />
              <span>Etiquetas Rápidas:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddTag(tag)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-indigo-600/20 hover:border-indigo-500/40 border border-slate-700/60 text-[10px] text-slate-300 hover:text-indigo-300 transition-all cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer con Botón de Guardar */}
        <div className="pt-2 sticky bottom-0 bg-slate-900 pb-2">
          <button
            type="submit"
            disabled={saving}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-lg ${
              savedSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 disabled:opacity-50'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>¡Guardado con Éxito!</span>
              </>
            ) : saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Ficha CRM</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
