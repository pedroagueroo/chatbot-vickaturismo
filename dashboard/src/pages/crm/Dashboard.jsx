import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  AreaChart,
  Area,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  MessageSquare,
  Users,
  Compass,
  TrendingUp,
  UserCheck,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

const Sparkline = ({ data, dataKey, color }) => {
  if (!data || data.length < 2) return <div className="w-14 h-7" />;
  return (
    <div className="w-14 h-7">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 1, left: 1, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CrmDashboard = () => {
  const { businessId, businessName, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    todayConversations: 0,
    totalCustomers: 0,
    totalMessages: 0,
    activeFaqs: 0,
    botActive: true,
  });

  const [chartData, setChartData] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    fetchDashboardData();
  }, [businessId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [
        { count: customersCount },
        { count: messagesCount },
        { count: faqsCount },
        { count: todayConvsCount },
        { data: latestCustomers },
        { data: recentMsgs },
        { data: recentLeads }
      ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
        supabase.from('faqs').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('is_active', true),
        supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('business_id', businessId).gte('created_at', todayStart.toISOString()),
        supabase.from('customers').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(5),
        supabase.from('messages').select('created_at').eq('business_id', businessId).gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('customers').select('created_at').eq('business_id', businessId).gte('created_at', sevenDaysAgo.toISOString())
      ]);

      // 6. Mensajes de los últimos 7 días para el gráfico
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
        last7Days.push({
          date: dayStr,
          rawDate: d.toISOString().slice(0, 10),
          mensajes: 0,
          leads: 0,
        });
      }

      if (recentMsgs) {
        recentMsgs.forEach((msg) => {
          const msgDay = new Date(msg.created_at).toISOString().slice(0, 10);
          const found = last7Days.find((d) => d.rawDate === msgDay);
          if (found) found.mensajes += 1;
        });
      }

      if (recentLeads) {
        recentLeads.forEach((lead) => {
          const leadDay = new Date(lead.created_at).toISOString().slice(0, 10);
          const found = last7Days.find((d) => d.rawDate === leadDay);
          if (found) found.leads += 1;
        });
      }

      setStats({
        todayConversations: todayConvsCount || 0,
        totalCustomers: customersCount || 0,
        totalMessages: messagesCount || 0,
        activeFaqs: faqsCount || 0,
        botActive: true,
      });

      setRecentCustomers(latestCustomers || []);
      setChartData(last7Days);
    } catch (err) {
      console.error('Error cargando métricas de dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-display text-xl md:text-2xl font-bold text-white tracking-tight">
              Resumen
            </h1>
            {isSuperAdmin && (
              <span className="text-[10px] font-mono bg-orange-950/60 text-orange-300 border border-orange-900 px-2 py-0.5 rounded">
                VISTA SUPERADMIN
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Centro de control y actividad de WhatsApp en vivo para{' '}
            <span className="text-teal-400 font-semibold">{businessName}</span>.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchDashboardData}
            title="Refrescar Estadísticas"
            className="p-2.5 surface-well hover:brightness-125 text-slate-300 rounded-md transition-all cursor-pointer flex items-center space-x-1 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <button
            onClick={() => navigate('/crm/inbox')}
            className="bg-teal-600 hover:bg-teal-500 text-white font-medium py-2 px-3.5 rounded-md text-xs md:text-sm transition-colors flex items-center space-x-1.5 cursor-pointer btn-neu"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Abrir Inbox Live</span>
          </button>
        </div>
      </div>

      {/* Tira de Métricas: una sola pieza dividida, no cuatro tarjetas repetidas */}
      <div className="surface-glass rounded-md flex flex-col sm:flex-row divide-y divide-dashed divide-slate-700/50 sm:divide-y-0 sm:divide-x">
        {/* Conversaciones Hoy */}
        <div className="flex-1 p-5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Conversaciones · Hoy
          </span>
          <div className="mt-2 flex items-end justify-between">
            <p className="font-display text-4xl font-bold text-white leading-none">
              {loading ? <span className="inline-block w-10 h-8 rounded bg-slate-700/40 animate-pulse align-middle" /> : stats.todayConversations}
            </p>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">actualiza al instante</p>
        </div>

        {/* Base de Leads */}
        <div className="flex-1 p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Base de Leads
            </span>
            <Sparkline data={chartData} dataKey="leads" color="#ea580c" />
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="font-display text-4xl font-bold text-white leading-none">
              {loading ? <span className="inline-block w-10 h-8 rounded bg-slate-700/40 animate-pulse align-middle" /> : stats.totalCustomers}
            </p>
            <button
              onClick={() => navigate('/crm/customers')}
              className="text-[11px] font-semibold text-orange-400 hover:text-orange-300 flex items-center cursor-pointer pb-1"
            >
              ver todos
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Mensajes Procesados */}
        <div className="flex-1 p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Mensajes WhatsApp
            </span>
            <Sparkline data={chartData} dataKey="mensajes" color="#14b8a6" />
          </div>
          <div className="mt-2 flex items-end justify-between">
            <p className="font-display text-4xl font-bold text-white leading-none">
              {loading ? <span className="inline-block w-10 h-8 rounded bg-slate-700/40 animate-pulse align-middle" /> : stats.totalMessages}
            </p>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">total histórico</p>
        </div>

        {/* Estado del Bot & FAQs */}
        <div className="flex-1 p-5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            IA Activa
          </span>
          <div className="mt-2 flex items-end justify-between">
            <p className="font-display text-xl font-bold text-white leading-none truncate">
              Claude 3.5 Sonnet
            </p>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">{stats.activeFaqs} FAQs activas</p>
        </div>
      </div>

      {/* Sección Central: Gráfico de Actividad & Panel de Últimos Clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Recharts de Evolución de Mensajes (2 Columnas) */}
        <div className="lg:col-span-2 surface-glass rounded-md p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
            <div className="flex items-center space-x-2.5">
              <TrendingUp className="w-4 h-4 text-teal-500" />
              <div>
                <h3 className="font-display font-bold text-sm text-white">Evolución de Mensajes (Últimos 7 Días)</h3>
                <p className="text-[11px] text-slate-500">Volumen de interacciones procesadas por la IA</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-500"></span>
                <span className="text-slate-300">Mensajes</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-600"></span>
                <span className="text-slate-300">Leads</span>
              </div>
            </div>
          </div>

          {/* Gráfico */}
          <div className="h-64 w-full pt-2">
            {loading ? (
              <div className="h-full w-full rounded bg-slate-700/20 animate-pulse" />
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Sin datos suficientes de los últimos 7 días
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorLead" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c2410c" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#c2410c" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.7)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      borderColor: 'rgba(148, 163, 184, 0.15)',
                      borderRadius: '0.375rem',
                      fontSize: '12px',
                      color: '#fff',
                      boxShadow: '0 8px 20px -8px rgba(0,0,0,0.6)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="mensajes"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMsg)"
                    name="Mensajes"
                  />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke="#ea580c"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLead)"
                    name="Nuevos Leads"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Últimos Clientes Capturados (1 Columna) */}
        <div className="surface-glass rounded-md p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
              <div className="flex items-center space-x-2.5">
                <UserCheck className="w-4 h-4 text-orange-500" />
                <h3 className="font-display font-bold text-sm text-white">Leads Recientes</h3>
              </div>
              <button
                onClick={() => navigate('/crm/customers')}
                className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold cursor-pointer"
              >
                Ver todos
              </button>
            </div>

            {loading ? (
              <div className="space-y-2 py-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 rounded bg-slate-700/20 animate-pulse" />
                ))}
              </div>
            ) : recentCustomers.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-600 opacity-40" />
                <p>No hay clientes registrados aún.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {recentCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate('/crm/customers')}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-800/40 p-2 rounded-md transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-teal-400 flex-shrink-0">
                        {c.name?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-semibold text-white group-hover:text-teal-300 transition-colors truncate">
                          {c.name || 'Cliente sin nombre'}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500 truncate">
                          {c.phone || c.platform_id}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(c.created_at || Date.now()).toLocaleDateString('es-ES', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Banner de Acceso Rápido */}
          <div className="p-3 surface-well border-l-[3px] border-l-teal-600 rounded-md flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-teal-500 flex-shrink-0" />
              <span className="text-xs text-slate-200 font-medium">Gestión de IA & FAQs</span>
            </div>
            <button
              onClick={() => navigate('/crm/faqs')}
              className="text-[11px] font-bold text-teal-300 hover:text-white bg-slate-800 hover:bg-teal-600 px-2.5 py-1 rounded transition-colors cursor-pointer"
            >
              Configurar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
