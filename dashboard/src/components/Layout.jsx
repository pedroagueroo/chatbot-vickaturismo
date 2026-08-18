import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare,
  Bot,
  HelpCircle,
  Users,
  LogOut,
  Building2,
  Menu,
  X,
  ShieldAlert,
  LayoutDashboard,
  ChevronDown,
  Sparkles
} from 'lucide-react';

export const Layout = () => {
  const {
    profile,
    logout,
    isSuperAdmin,
    businessName,
    businesses,
    selectedBusinessId,
    setSelectedBusinessId,
  } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const crmNavItems = [
    { name: 'Resumen CRM', path: '/crm', icon: LayoutDashboard },
    { name: 'Inbox Chat (Live)', path: '/crm/inbox', icon: MessageSquare },
    { name: 'Base de Clientes', path: '/crm/customers', icon: Users },
    { name: 'Configuración Bot', path: '/crm/config', icon: Bot },
    { name: 'Preguntas Frecuentes', path: '/crm/faqs', icon: HelpCircle },
  ];

  const adminNavItems = [
    { name: 'Control Global', path: '/admin', icon: ShieldAlert },
    { name: 'Empresas SaaS', path: '/admin/businesses', icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <Bot className="w-6 h-6 text-indigo-400" />
          <span className="font-bold text-sm text-white">Vicka Bot SaaS</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-400 hover:text-white p-1"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Logo & Platform Info */}
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div className="overflow-hidden flex-1">
              <h2 className="font-bold text-sm text-white truncate tracking-tight">
                {isSuperAdmin ? 'Panel Super Admin' : businessName}
              </h2>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-medium text-slate-400">
                  {isSuperAdmin ? 'Acceso Total' : 'Business Admin'}
                </span>
              </div>
            </div>
          </div>

          {/* Super Admin: Selector de Empresa Activa (Modo Impersonación) */}
          {isSuperAdmin && (
            <div className="p-3 bg-slate-950/80 border border-indigo-500/30 rounded-xl space-y-2 shadow-inner">
              <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-300">
                <span className="flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>Empresa Activa (CRM):</span>
                </span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-mono">
                  {businesses.length}
                </span>
              </div>
              <div className="relative">
                <select
                  value={selectedBusinessId || ''}
                  onChange={(e) => setSelectedBusinessId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer appearance-none pr-7 font-medium"
                >
                  {businesses.map((biz) => (
                    <option key={biz.id} value={biz.id} className="bg-slate-900 text-white">
                      🏢 {biz.name} {biz.status !== 'active' ? `(${biz.status})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="space-y-4">
            {/* Super Admin Section (si aplica) */}
            {isSuperAdmin && (
              <div className="space-y-1">
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Gestión SaaS
                </div>
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-purple-600/90 text-white shadow-lg shadow-purple-600/20 font-semibold'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}

            {/* CRM Modules Section */}
            <div className="space-y-1">
              {isSuperAdmin && (
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
                  <span>Módulos del Cliente</span>
                  <span className="text-[9px] text-slate-400 font-normal truncate max-w-[90px]">
                    ({businessName})
                  </span>
                </div>
              )}
              {crmNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/crm'}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 font-semibold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>

        {/* User Info & Logout Button */}
        <div className="p-3.5 m-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2.5">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-7 h-7 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">
              {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {profile?.full_name || 'Usuario'}
              </p>
              <p className="text-[10px] text-slate-400 truncate font-mono">{profile?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium py-1.5 px-3 rounded-lg transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-950 min-h-screen overflow-y-auto p-5 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};

