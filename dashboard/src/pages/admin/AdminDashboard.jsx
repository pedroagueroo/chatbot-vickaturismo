import React from 'react';
import { ShieldAlert, Building2, Users } from 'lucide-react';

export const AdminDashboard = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
        <ShieldAlert className="w-6 h-6 text-indigo-400" />
        <span>Panel Super Admin (Gestión Global)</span>
      </h1>
      <p className="text-sm text-slate-400">Administración de clientes SaaS y métricas de plataforma.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Empresas Registradas</span>
          <Building2 className="w-4 h-4 text-indigo-400" />
        </div>
        <p className="text-2xl font-bold text-white">1 (Vicka Turismo)</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Usuarios SaaS</span>
          <Users className="w-4 h-4 text-purple-400" />
        </div>
        <p className="text-2xl font-bold text-white">1</p>
      </div>
    </div>
  </div>
);
