import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  ShieldAlert,
  Building2,
  Users,
  MessageSquare,
  Activity,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Loader2,
  ArrowUpRight,
  Server
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    activeBusinesses: 0,
    suspendedBusinesses: 0,
    totalProfiles: 0,
    totalConversations: 0,
    totalMessages: 0,
    totalFaqs: 0,
  });
  const [recentBusinesses, setRecentBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGlobalMetrics();
  }, []);

  const fetchGlobalMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Obtener empresas
      const { data: businesses, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (bizError) throw bizError;

      const totalBiz = businesses?.length || 0;
      const activeBiz = businesses?.filter((b) => b.status === 'active').length || 0;
      const suspendedBiz = businesses?.filter((b) => b.status === 'suspended').length || 0;

      // 2. Obtener usuarios (profiles)
      const { count: profilesCount, error: profError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (profError) throw profError;

      // 3. Obtener conversaciones
      const { count: convCount, error: convError } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });

      if (convError) throw convError;

      // 4. Obtener mensajes totales
      const { count: msgCount, error: msgError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      if (msgError) throw msgError;

      // 5. Obtener FAQs totales
      const { count: faqsCount, error: faqsError } = await supabase
        .from('faqs')
        .select('*', { count: 'exact', head: true });

      if (faqsError) throw faqsError;

      setStats({
        totalBusinesses: totalBiz,
        activeBusinesses: activeBiz,
        suspendedBusinesses: suspendedBiz,
        totalProfiles: profilesCount || 0,
        totalConversations: convCount || 0,
        totalMessages: msgCount || 0,
        totalFaqs: faqsCount || 0,
      });

      setRecentBusinesses(businesses?.slice(0, 5) || []);
    } catch (err) {
      console.error('Error cargando métricas globales:', err);
      setError('No se pudieron cargar las métricas globales: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            <span>Centro de Control Global (Super Admin)</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Monitoreo en tiempo real de empresas, usuarios y volumen de IA en la plataforma SaaS.
          </p>
        </div>

        <Link
          to="/admin/businesses"
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-xl text-xs md:text-sm transition-all shadow-lg shadow-indigo-600/20 flex-shrink-0"
        >
          <Building2 className="w-4 h-4" />
          <span>Gestionar Empresas</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400 space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-xs">Cargando métricas de la plataforma...</span>
        </div>
      ) : (
        <>
          {/* Métricas Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Empresas Activas */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Empresas Totales
                </span>
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-white">{stats.totalBusinesses}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{stats.activeBusinesses} Activas</span>
                  </span>
                  {stats.suspendedBusinesses > 0 && (
                    <span className="inline-flex items-center space-x-1 text-[11px] text-amber-400 font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{stats.suspendedBusinesses} Suspendidas</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Usuarios Registrados */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Usuarios SaaS
                </span>
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-white">{stats.totalProfiles}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Administradores de agencias y operadores
                </p>
              </div>
            </div>

            {/* Card 3: Mensajes Procesados */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Mensajes de WhatsApp
                </span>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-white">{stats.totalMessages}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {stats.totalConversations} conversaciones iniciadas
                </p>
              </div>
            </div>

            {/* Card 4: Base de Conocimiento Global */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Base de FAQs
                </span>
                <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                  <HelpCircle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-white">{stats.totalFaqs}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Respuestas oficiales activas en Claude
                </p>
              </div>
            </div>
          </div>

          {/* Sección de Estado del Servidor & Agencias Recientes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agencias Recientes */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-2 text-white font-bold text-sm">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <h2>Últimas Agencias Registradas</h2>
                </div>
                <Link
                  to="/admin/businesses"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center space-x-1"
                >
                  <span>Ver todas</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentBusinesses.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No hay empresas registradas aún.
                </p>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {recentBusinesses.map((b) => (
                    <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-white">{b.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          ID: {b.id.substring(0, 13)}...
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            b.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {b.status === 'active' ? 'Activo' : 'Suspendido'}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                            b.whatsapp_phone_number_id
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {b.whatsapp_phone_number_id ? 'WhatsApp OK' : 'Sin WhatsApp'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Estado del Sistema */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-white font-bold text-sm border-b border-slate-800/80 pb-3">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <h2>Infraestructura Cloud</h2>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Motor de Base de Datos</span>
                    <span className="font-semibold text-emerald-400">PostgreSQL (Supabase)</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Edge Functions</span>
                    <span className="font-semibold text-emerald-400">Deno Deploy (Online)</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Modelo de IA</span>
                    <span className="font-semibold text-indigo-400">Claude 3.5 Sonnet</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Canal de Chat</span>
                    <span className="font-semibold text-emerald-400">Meta Cloud API v20.0</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Seguridad RLS</span>
                    <span className="font-semibold text-emerald-400">Habilitada & Aislada</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Versión SaaS: 1.0.0</span>
                <span className="flex items-center space-x-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Sistemas Operativos</span>
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
