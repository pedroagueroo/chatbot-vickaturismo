import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  MessageSquare,
  Bot,
  Users,
  Sparkles,
  TrendingUp,
  UserCheck,
  ChevronRight,
  Loader2,
  RefreshCw
} from 'lucide-react';

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
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Panel CRM & Métricas
            </h1>
            {isSuperAdmin && (
              <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                Vista SuperAdmin
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Centro de control y actividad de WhatsApp en vivo para{' '}
            <span className="text-indigo-300 font-semibold">{businessName}</span>.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchDashboardData}
            title="Refrescar Estadísticas"
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer flex items-center space-x-1 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <button
            onClick={() => navigate('/crm/inbox')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-3.5 rounded-xl text-xs md:text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center space-x-1.5 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Abrir Inbox Live</span>
          </button>
        </div>
      </div>

      {/* Grid de Métricas Principales (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Conversaciones Hoy */}
        <div className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 p-5 rounded-2xl transition-all shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Conversaciones Hoy
            </span>
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-bold text-white tracking-tight">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-400" /> : stats.todayConversations}
            </p>
            <span className="text-[11px] font-medium text-emerald-400 flex items-center space-x-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>En tiempo real</span>
            </span>
          </div>
        </div>

        {/* KPI 2: Total Clientes / Leads */}
        <div className="bg-slate-900 border border-slate-800 hover:border-purple-500/40 p-5 rounded-2xl transition-all shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Base de Leads
            </span>
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-bold text-white tracking-tight">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-purple-400" /> : stats.totalCustomers}
            </p>
            <button
              onClick={() => navigate('/crm/customers')}
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-0.5 cursor-pointer"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* KPI 3: Mensajes Procesados */}
        <div className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 p-5 rounded-2xl transition-all shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Mensajes de WhatsApp
            </span>
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-bold text-white tracking-tight">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-400" /> : stats.totalMessages}
            </p>
            <span className="text-[11px] font-mono text-slate-400">Total histórico</span>
          </div>
        </div>

        {/* KPI 4: Estado del Bot & FAQs */}
        <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 p-5 rounded-2xl transition-all shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              IA & FAQs Activas
            </span>
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 group-hover:scale-110 transition-transform">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-sm font-bold text-emerald-400 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Claude 3.5 Sonnet</span>
            </p>
            <span className="text-xs font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
              {stats.activeFaqs} FAQs
            </span>
          </div>
        </div>
      </div>

      {/* Sección Central: Gráfico de Actividad & Panel de Últimos Clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Recharts de Evolución de Mensajes (2 Columnas) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Evolución de Mensajes (Últimos 7 Días)</h3>
                <p className="text-[11px] text-slate-400">Volumen de interacciones procesadas por la IA</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                <span className="text-slate-300">Mensajes</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                <span className="text-slate-300">Leads</span>
              </div>
            </div>
          </div>

          {/* Gráfico */}
          <div className="h-64 w-full pt-2">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Sin datos suficientes de los últimos 7 días
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorLead" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="mensajes"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMsg)"
                    name="Mensajes"
                  />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke="#a855f7"
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-white">Leads Recientes</h3>
              </div>
              <button
                onClick={() => navigate('/crm/customers')}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                Ver todos
              </button>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
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
                    className="py-2.5 flex items-center justify-between hover:bg-slate-800/40 p-2 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600/30 to-purple-600/30 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-300 flex-shrink-0">
                        {c.name?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                          {c.name || 'Cliente sin nombre'}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 truncate">
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
          <div className="p-3 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span className="text-xs text-slate-200 font-medium">Gestión de IA & FAQs</span>
            </div>
            <button
              onClick={() => navigate('/crm/faqs')}
              className="text-[11px] font-bold text-indigo-300 hover:text-white bg-indigo-600/30 hover:bg-indigo-600 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Configurar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
