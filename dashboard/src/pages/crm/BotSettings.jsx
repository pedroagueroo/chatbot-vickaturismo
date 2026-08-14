import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  Bot,
  Sparkles,
  MessageSquare,
  Clock,
  Phone,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';

export const BotSettings = () => {
  const { businessId, isSuperAdmin } = useAuth();

  const [targetBusinessId, setTargetBusinessId] = useState(businessId || null);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Bot Config State
  const [agencyName, setAgencyName] = useState('');
  const [botPersonality, setBotPersonality] = useState('');
  const [welcomeMsg, setWelcomeMsg] = useState('');
  const [outOfHoursMsg, setOutOfHoursMsg] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [keywordsText, setKeywordsText] = useState('');

  // WhatsApp Credentials State (Stored in businesses table)
  const [phoneId, setPhoneId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  // 1. Si es Super Admin y no tiene businessId directo, cargar listado de empresas
  useEffect(() => {
    if (isSuperAdmin && !businessId) {
      fetchBusinessesList();
    } else if (businessId) {
      setTargetBusinessId(businessId);
    }
  }, [businessId, isSuperAdmin]);

  const fetchBusinessesList = async () => {
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
      console.error('Error cargando lista de empresas:', err);
    }
  };

  // 2. Cargar configuración del bot cuando haya un targetBusinessId
  useEffect(() => {
    if (!targetBusinessId) return;
    loadBotData(targetBusinessId);
  }, [targetBusinessId]);

  const loadBotData = async (bId) => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      // A. Cargar bot_config
      const { data: configData, error: configError } = await supabase
        .from('bot_config')
        .select('*')
        .eq('business_id', bId)
        .maybeSingle();

      if (configError) throw configError;

      if (configData) {
        setAgencyName(configData.agency_name || '');
        setBotPersonality(configData.bot_personality || '');
        setWelcomeMsg(configData.welcome_msg || '');
        setOutOfHoursMsg(configData.out_of_hours_msg || '');
        setContactPhone(configData.contact_info?.phone || '');
        setContactEmail(configData.contact_info?.email || '');
        setKeywordsText((configData.escalation_keywords || []).join(', '));
      } else {
        // Valores por defecto
        setAgencyName('');
        setBotPersonality('Sos amigable, conciso y un experto en ventas.');
        setWelcomeMsg('¡Hola! ¿En qué puedo ayudarte hoy?');
        setOutOfHoursMsg('En este momento estamos fuera de horario. Te contactaremos a la brevedad.');
        setContactPhone('');
        setContactEmail('');
        setKeywordsText('hablar con alguien, humano, asesor, agente');
      }

      // B. Cargar credenciales de WhatsApp desde businesses
      const { data: bizData, error: bizError } = await supabase
        .from('businesses')
        .select('whatsapp_phone_number_id, whatsapp_access_token')
        .eq('id', bId)
        .single();

      if (bizError) throw bizError;

      if (bizData) {
        setPhoneId(bizData.whatsapp_phone_number_id || '');
        setAccessToken(bizData.whatsapp_access_token || '');
      }
    } catch (err) {
      console.error('Error cargando configuración:', err.message);
      setFeedback({ type: 'error', message: 'Error al cargar la configuración: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!targetBusinessId) return;

    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const parsedKeywords = keywordsText
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const contactInfoObj = {
        phone: contactPhone.trim(),
        email: contactEmail.trim(),
      };

      // 1. Guardar o actualizar bot_config
      const { error: botError } = await supabase
        .from('bot_config')
        .upsert(
          {
            business_id: targetBusinessId,
            agency_name: agencyName.trim() || 'Mi Agencia',
            bot_personality: botPersonality.trim(),
            welcome_msg: welcomeMsg.trim(),
            out_of_hours_msg: outOfHoursMsg.trim(),
            contact_info: contactInfoObj,
            escalation_keywords: parsedKeywords,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'business_id' }
        );

      if (botError) throw botError;

      // 2. Guardar credenciales de Meta en businesses
      const { error: bizError } = await supabase
        .from('businesses')
        .update({
          whatsapp_phone_number_id: phoneId.trim(),
          whatsapp_access_token: accessToken.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetBusinessId);

      if (bizError) throw bizError;

      setFeedback({
        type: 'success',
        message: '¡Configuración guardada exitosamente! El bot aplicará estos cambios en su próxima respuesta.',
      });

      setTimeout(() => {
        setFeedback({ type: '', message: '' });
      }, 5000);
    } catch (err) {
      console.error('Error guardando configuración:', err);
      setFeedback({ type: 'error', message: 'Error al guardar: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center space-x-2.5">
            <Bot className="w-6 h-6 text-indigo-400" />
            <span>Configuración del Agente IA</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Personalizá cómo responde Claude a tus clientes en WhatsApp y gestioná las credenciales.
          </p>
        </div>

        {/* Selector de empresa si es Super Admin */}
        {isSuperAdmin && businesses.length > 0 && (
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <label className="text-xs text-slate-400">Empresa:</label>
            <select
              value={targetBusinessId || ''}
              onChange={(e) => setTargetBusinessId(e.target.value)}
              className="bg-slate-950 text-xs text-white border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback.message && (
        <div
          className={`p-4 rounded-xl text-xs md:text-sm flex items-start space-x-3 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400 space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-xs">Cargando configuración del bot...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Card 1: Personalidad & Prompt del Sistema */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
              <Sparkles className="w-4 h-4" />
              <h2>Identidad y Personalidad de la IA</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre Comercial de la Agencia
                </label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="Ej: Vicka Turismo"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span>Personalidad y Directivas para Claude (Prompt)</span>
                  <span className="text-[10px] text-slate-500">Define el tono y estilo de respuesta</span>
                </label>
                <textarea
                  rows={4}
                  value={botPersonality}
                  onChange={(e) => setBotPersonality(e.target.value)}
                  placeholder="Ej: Sos un asesor apasionado por el turismo, hablás con voseo rioplatense, sos amable y buscás cerrar ventas..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Mensajes Automáticos & Escalamiento */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
              <MessageSquare className="w-4 h-4" />
              <h2>Mensajes Predefinidos y Reglas de Atención</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Mensaje de Bienvenida Inicial
                </label>
                <input
                  type="text"
                  value={welcomeMsg}
                  onChange={(e) => setWelcomeMsg(e.target.value)}
                  placeholder="¡Hola! Soy el asistente virtual de la agencia..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Mensaje Fuera de Horario
                </label>
                <input
                  type="text"
                  value={outOfHoursMsg}
                  onChange={(e) => setOutOfHoursMsg(e.target.value)}
                  placeholder="En este momento nuestras oficinas están cerradas..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span>Palabras Clave para Escalar a Humano (Separadas por comas)</span>
                  <span className="text-[10px] text-slate-500">La IA se silenciará si el usuario las menciona</span>
                </label>
                <input
                  type="text"
                  value={keywordsText}
                  onChange={(e) => setKeywordsText(e.target.value)}
                  placeholder="humano, asesor, queja, hablar con alguien, llamar"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Datos de Contacto de la Empresa */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
              <Phone className="w-4 h-4" />
              <h2>Datos de Contacto Públicos</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Teléfono de Atención / Oficina
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+54 9 11 1234-5678"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Correo Electrónico de Contacto
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contacto@agencia.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Credenciales de WhatsApp (Meta Cloud API) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
              <Key className="w-4 h-4" />
              <h2>Conexión con Meta Cloud API (WhatsApp)</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  WhatsApp Phone Number ID
                </label>
                <input
                  type="text"
                  value={phoneId}
                  onChange={(e) => setPhoneId(e.target.value)}
                  placeholder="Ej: 1140146155842603"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none font-mono transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span>Meta Permanent Access Token</span>
                  <span className="text-[10px] text-slate-500">Token del sistema de Meta para enviar mensajes</span>
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="EAAYXMG..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-600 outline-none font-mono transition-all"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 px-6 rounded-xl text-xs md:text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando cambios...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Configuración</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
