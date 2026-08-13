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
  LayoutDashboard
} from 'lucide-react';

export const Layout = () => {
  const { profile, logout, isSuperAdmin, businessName } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = isSuperAdmin
    ? [
        { name: 'Gestión Global', path: '/admin', icon: ShieldAlert },
        { name: 'Empresas SaaS', path: '/admin/businesses', icon: Building2 },
      ]
    : [
        { name: 'Resumen CRM', path: '/crm', icon: LayoutDashboard },
        { name: 'Inbox Chat (Live)', path: '/crm/inbox', icon: MessageSquare },
        { name: 'Configuración Bot', path: '/crm/config', icon: Bot },
        { name: 'Preguntas Frecuentes', path: '/crm/faqs', icon: HelpCircle },
      ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="w-6 h-6 text-indigo-400" />
          <span className="font-bold text-sm text-white">SaaS CRM</span>
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
        <div className="p-6 space-y-6">
          {/* Logo & Company Name */}
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-800/80">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Bot className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-bold text-sm text-white truncate">{businessName}</h2>
              <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full inline-block mt-0.5">
                {isSuperAdmin ? 'Super Admin' : 'Business Admin'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/crm' || item.path === '/admin'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout Button */}
        <div className="p-4 m-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-indigo-400 border border-slate-700">
              {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-slate-200 truncate">
                {profile?.full_name || 'Usuario'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{profile?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium py-1.5 px-3 rounded-lg transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-950 min-h-screen overflow-y-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};
