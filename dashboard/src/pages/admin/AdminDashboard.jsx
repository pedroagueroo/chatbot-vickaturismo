import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  LayoutGrid,
  Building2,
  CheckCircle2,
  AlertTriangle,
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
      <div className="border-b border-slate-800 pb-5">
        <h1 className="font-display text-xl md:text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
          <LayoutGrid className="w-6 h-6 text-teal-500" />
          <span>Dashboard</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Monitoreo en tiempo real de empresas, usuarios y volumen de IA en la plataforma SaaS.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-red-950/40 border border-red-900 text-red-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="surface-glass rounded-md p-5 h-[92px] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Métricas Principales: una sola tira dividida, no cuatro tarjetas repetidas */}
          <div className="surface-glass rounded-md flex flex-col sm:flex-row divide-y divide-dashed divide-slate-700/50 sm:divide-y-0 sm:divide-x">
            {/* Empresas Totales */}
            <div className="flex-1 p-5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Empresas Totales
              </span>
              <p className="mt-2 font-display text-4xl font-bold text-white leading-none">
                {stats.totalBusinesses}
              </p>
              <div className="flex items-center flex-wrap gap-x-2 mt-1.5">
                <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{stats.activeBusinesses} activas</span>
                </span>
                {stats.suspendedBusinesses > 0 && (
                  <span className="inline-flex items-center space-x-1 text-[11px] text-amber-400 font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{stats.suspendedBusinesses} suspendidas</span>
                  </span>
                )}
              </div>
            </div>

            {/* Usuarios SaaS */}
            <div className="flex-1 p-5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Usuarios SaaS
              </span>
              <p className="mt-2 font-display text-4xl font-bold text-white leading-none">
                {stats.totalProfiles}
              </p>
              <p className="mt-1.5 text-[11px] text-slate-500">administradores y operadores</p>
            </div>

            {/* Mensajes de WhatsApp */}
            <div className="flex-1 p-5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Mensajes WhatsApp
              </span>
              <p className="mt-2 font-display text-4xl font-bold text-white leading-none">
                {stats.totalMessages}
              </p>
              <p className="mt-1.5 text-[11px] text-slate-500">{stats.totalConversations} conversaciones</p>
            </div>

            {/* Base de FAQs */}
            <div className="flex-1 p-5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Base de FAQs
              </span>
              <p className="mt-2 font-display text-4xl font-bold text-white leading-none">
                {stats.totalFaqs}
              </p>
              <p className="mt-1.5 text-[11px] text-slate-500">respuestas activas en Claude</p>
            </div>
          </div>

          {/* Sección de Estado del Servidor & Agencias Recientes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agencias Recientes */}
            <div className="lg:col-span-2 surface-glass rounded-md p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
                <div className="flex items-center space-x-2 text-white font-bold text-sm">
                  <Building2 className="w-4 h-4 text-teal-500" />
                  <h2 className="font-display">Últimas Agencias Registradas</h2>
                </div>
                <Link
                  to="/admin/businesses"
                  className="text-xs text-teal-400 hover:text-teal-300 font-medium inline-flex items-center space-x-1"
                >
                  <span>Ver empresas</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentBusinesses.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No hay empresas registradas aún.
                </p>
              ) : (
                <div className="divide-y divide-slate-700/40">
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
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            b.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {b.status === 'active' ? 'Activo' : 'Suspendido'}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                            b.whatsapp_phone_number_id
                              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
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
            <div className="surface-glass rounded-md p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-white font-bold text-sm border-b border-slate-700/50 pb-3">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <h2 className="font-display">Infraestructura Cloud</h2>
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
                    <span className="font-semibold text-teal-400">Claude 3.5 Sonnet</span>
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

              <div className="pt-4 border-t border-slate-700/50 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Versión SaaS: 1.0.0</span>
                <span className="flex items-center space-x-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
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
