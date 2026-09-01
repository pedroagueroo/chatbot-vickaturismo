import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CompanySwitcher } from './CompanySwitcher';
import {
  MessageSquare,
  Bot,
  HelpCircle,
  Users,
  LogOut,
  Building2,
  Menu,
  X,
  LayoutGrid,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Compass
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
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const crmNavItems = [
    { name: 'Resumen', path: '/crm', icon: LayoutDashboard },
    { name: 'Inbox', path: '/crm/inbox', icon: MessageSquare },
    { name: 'Clientes', path: '/crm/customers', icon: Users },
    { name: 'Configuración bot', path: '/crm/config', icon: Bot },
    { name: 'Preguntas frecuentes', path: '/crm/faqs', icon: HelpCircle },
  ];

  const adminNavItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutGrid },
    { name: 'Empresas', path: '/admin/businesses', icon: Building2 },
  ];

  // Clases del texto de un item de nav: colapsa en ancho/opacidad (no "hidden" abrupto)
  const navLabelClass = `overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out max-w-[160px] opacity-100 ${
    collapsed ? 'md:max-w-0 md:opacity-0' : ''
  }`;

  // Secciones full-row (títulos, selector) que se ocultan por completo al colapsar, sin dejar hueco
  const collapsibleBlockClass = collapsed ? 'md:hidden' : '';

  // Separador sutil entre grupos, solo visible en modo íconos
  const railDividerClass = `mx-auto w-7 h-px bg-slate-800/80 hidden ${collapsed ? 'md:block' : ''}`;

  const getNavLinkClass = (isActive, accent) => {
    const activeBg = accent === 'orange' ? 'bg-orange-950/60 text-orange-300' : 'bg-teal-950/60 text-teal-300';
    const activeBorder = accent === 'orange' ? 'border-orange-600' : 'border-teal-500';
    const activeRing = accent === 'orange' ? 'md:ring-1 md:ring-orange-500/40' : 'md:ring-1 md:ring-teal-400/40';
    return [
      'group flex items-center gap-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 border-l-2',
      collapsed ? 'md:justify-center md:mx-auto md:gap-0 md:w-10 md:h-10 md:px-0 md:py-0 md:rounded-xl md:border-l-0' : 'px-3',
      isActive
        ? `${activeBg} ${activeBorder} font-semibold ${collapsed ? activeRing : ''}`
        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60',
    ].join(' ');
  };

  return (
    <div className="h-screen h-dvh overflow-hidden text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex-shrink-0 surface-glass p-4 flex items-center justify-between sticky top-0 z-40 rounded-none border-x-0 border-t-0">
        <div className="flex items-center space-x-2">
          <Compass className="w-6 h-6 text-teal-500" />
          <span className="font-display font-bold text-sm text-white">Vicka Turismo</span>
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
        className={`fixed md:relative inset-y-0 left-0 z-50 w-64 ${
          collapsed ? 'md:w-20' : 'md:w-64'
        } surface-glass rounded-none border-y-0 border-l-0 flex flex-col justify-between overflow-hidden transform transition-[width,transform] duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className={`p-5 overflow-y-auto overflow-x-hidden flex-1 transition-all duration-200 ${collapsed ? 'md:px-2 md:space-y-3 space-y-5' : 'space-y-5'}`}>
          {/* Logo & Platform Info + Toggle (dentro del panel) */}
          <div
            className={`flex items-center pb-4 border-b border-slate-800/60 transition-all duration-200 ${
              collapsed ? 'md:flex-col md:gap-3' : 'justify-between gap-3'
            }`}
          >
            <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'md:justify-center md:gap-0' : ''}`}>
              <div className="w-9 h-9 flex items-center justify-center bg-teal-600 rounded-md text-white flex-shrink-0 btn-neu">
                <Compass className="w-4.5 h-4.5" />
              </div>
              <div className={navLabelClass}>
                <h2 className="font-display font-bold text-sm text-white truncate tracking-tight">
                  {isSuperAdmin ? 'Panel Super Admin' : businessName}
                </h2>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"></span>
                  <span className="text-[10px] font-medium text-slate-400 truncate">
                    {isSuperAdmin ? 'Acceso Total' : 'Business Admin'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-400 hover:text-teal-400 hover:border-teal-600/60 transition-colors cursor-pointer flex-shrink-0"
              title={collapsed ? 'Expandir panel' : 'Colapsar panel'}
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Navigation Links */}
          <div className={collapsed ? 'md:space-y-1.5 space-y-4' : 'space-y-4'}>
            {/* Sección General: navegación global del SaaS */}
            {isSuperAdmin && (
              <div className={collapsed ? 'md:space-y-1.5 space-y-1' : 'space-y-1'}>
                <div className={`px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 ${collapsibleBlockClass}`}>
                  General
                </div>
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end
                      title={item.name}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => getNavLinkClass(isActive, 'orange')}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className={navLabelClass}>{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}

            {isSuperAdmin && <div className={railDividerClass} />}

            {/* Sección Empresa: contexto de la empresa activa */}
            <div className={collapsed ? 'md:space-y-1.5 space-y-1' : 'space-y-1'}>
              {isSuperAdmin && (
                <div className={`px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 ${collapsibleBlockClass}`}>
                  Empresa
                </div>
              )}
              {isSuperAdmin && (
                <div className={`pb-2 ${collapsibleBlockClass}`}>
                  <CompanySwitcher
                    businesses={businesses}
                    selectedBusinessId={selectedBusinessId}
                    onSelect={setSelectedBusinessId}
                    collapsed={false}
                  />
                </div>
              )}
              {isSuperAdmin && collapsed && (
                <div className="hidden md:flex justify-center pb-2">
                  <CompanySwitcher
                    businesses={businesses}
                    selectedBusinessId={selectedBusinessId}
                    onSelect={setSelectedBusinessId}
                    collapsed={true}
                  />
                </div>
              )}
              {crmNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/crm'}
                    title={item.name}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => getNavLinkClass(isActive, 'teal')}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className={navLabelClass}>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>

        {/* User Info & Logout Button */}
        <div className={`surface-well rounded-md transition-all duration-200 ${collapsed ? 'md:mx-2 md:mb-3 md:mt-0 md:p-2 md:flex md:flex-col md:items-center md:gap-2 m-3' : 'm-3 p-3.5 space-y-2.5'}`}>
          <div className={`flex items-center overflow-hidden transition-all duration-200 ${collapsed ? 'md:justify-center md:gap-0 gap-2.5' : 'gap-2.5'}`}>
            <div className="w-7 h-7 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-teal-400 flex-shrink-0">
              {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
            </div>
            <div className={navLabelClass}>
              <p className="text-xs font-semibold text-slate-200 truncate">
                {profile?.full_name || 'Usuario'}
              </p>
              <p className="text-[10px] text-slate-400 truncate font-mono">{profile?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className={`flex items-center justify-center gap-1.5 bg-transparent hover:bg-red-950/40 text-red-400 border border-red-900/60 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${
              collapsed ? 'md:w-9 md:h-9 md:p-0 md:gap-0 md:rounded-xl w-full py-1.5' : 'w-full py-1.5 px-3'
            }`}
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            <span className={navLabelClass}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 overflow-y-auto scroll-stable p-5 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};

