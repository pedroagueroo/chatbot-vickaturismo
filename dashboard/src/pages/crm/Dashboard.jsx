import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Bot, Users, Clock } from 'lucide-react';

export const CrmDashboard = () => {
  const { businessName } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Panel CRM</h1>
        <p className="text-sm text-slate-400">Bienvenido al centro de control de {businessName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Conversaciones Hoy</span>
            <MessageSquare className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">0</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Estado del Bot</span>
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-emerald-400">Activo (IA Claude)</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Leads Capturados</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">0</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Tiempo de Respuesta</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-sm font-semibold text-slate-200">Inmediato (&lt; 2s)</p>
        </div>
      </div>
    </div>
  );
};
