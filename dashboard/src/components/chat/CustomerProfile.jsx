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
  Tag,
  AlertCircle
} from 'lucide-react';

const QUICK_TAGS = [
  'Prefiere Ventana',
  'Hoteles 4/5★',
  'Viaje Familiar',
  'Aventura/Mochilero',
  'Presupuesto Alto',
  'Cliente Frecuente',
  'Destinos Playa',
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
      <div className="flex-1 min-h-0 flex flex-col justify-center items-center text-slate-500 p-6 text-center space-y-3">
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
    <div className="flex-1 min-h-0 flex flex-col min-w-0 border-l border-slate-700/50 text-slate-200 overflow-hidden">
      {/* Header (fijo) */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between gap-3 surface-glass rounded-none border-x-0 border-t-0 flex-shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 flex-shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">
              Ficha del Cliente
            </h3>
            <p className="text-[10px] text-slate-400">CRM & Memoria IA</p>
          </div>
        </div>

        {/* AI Memory Badge */}
        <div className="flex items-center space-x-1.5 px-2 py-1 rounded border border-teal-900 text-teal-400 text-[10px] font-mono flex-shrink-0" title="La IA leerá estas notas en sus próximas respuestas">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
          <span>SYNC IA</span>
        </div>
      </div>

      {/* Formulario: envuelve tanto el body con scroll como el footer fijo,
          para que el submit (click o Enter) siga funcionando en todo el conjunto */}
      <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col">
        {/* Body con scroll: únicamente los campos */}
        <div className="flex-1 min-h-0 overflow-y-auto scroll-stable p-4 space-y-5">
          {errorMsg && (
            <div className="p-2.5 rounded-md bg-red-950/40 border border-red-900 text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nombre — campo principal, ocupa todo el ancho */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1.5">
              <User className="w-3 h-3 text-slate-500" />
              <span>Nombre Completo</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Pedro Agüero"
              className="w-full surface-well focus:border-teal-600 rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors"
            />
          </div>

          {/* Teléfono + DNI: mismo largo de dato, comparten fila */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1.5">
                <Phone className="w-3 h-3 text-slate-500" />
                <span>WhatsApp</span>
              </label>
              <input
                type="text"
                value={phone}
                disabled
                className="w-full surface-well rounded-md px-3 py-2 text-xs text-slate-400 font-mono cursor-not-allowed opacity-70"
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1.5">
                <CreditCard className="w-3 h-3 text-slate-500" />
                <span>DNI / Pasaporte</span>
              </label>
              <input
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="42123456"
                className="w-full surface-well focus:border-teal-600 rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1.5">
              <Mail className="w-3 h-3 text-slate-500" />
              <span>Correo Electrónico</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              className="w-full surface-well focus:border-teal-600 rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors"
            />
          </div>

          {/* Notas Internas y Preferencias */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1.5">
                <FileText className="w-3 h-3 text-slate-500" />
                <span>Notas & Preferencias</span>
              </label>
              <span className="text-[10px] text-slate-500 flex-shrink-0">Visible para el bot</span>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Viaja siempre con su familia. Prefiere hoteles con pensión completa. Destino favorito: Brasil."
              rows={4}
              className="w-full min-h-[100px] surface-well focus:border-teal-600 rounded-md p-3 text-xs text-slate-100 placeholder-slate-600 outline-none resize-none leading-relaxed transition-colors"
            />

            {/* Quick Tags */}
            <div className="pt-1.5 space-y-1.5">
              <div className="text-[10px] font-medium text-slate-500 flex items-center space-x-1">
                <Tag className="w-2.5 h-2.5" />
                <span>Etiquetas rápidas</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-teal-950 hover:border-teal-700 border border-slate-700/60 text-[10px] text-slate-300 hover:text-teal-300 transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer (fijo): acción principal siempre accesible */}
        <div className="flex-shrink-0 p-4 pt-3 border-t border-slate-700/50">
          <button
            type="submit"
            disabled={saving}
            className={`w-full py-2.5 px-4 rounded-md text-xs font-semibold flex items-center justify-center space-x-2 transition-colors btn-neu ${
              savedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-50'
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
