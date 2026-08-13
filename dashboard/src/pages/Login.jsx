import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bot, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await login(email, password);
      // El perfil se carga automáticamente en AuthContext y redirigimos
      if (data?.user) {
        navigate('/crm');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Credenciales inválidas. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 mb-2">
            <Bot className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Plataforma SaaS IA
          </h1>
          <p className="text-sm text-slate-400">
            Ingresá a tu CRM de WhatsApp y Gestión de Agentes
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 flex items-start space-x-3 text-red-400 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 ml-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className="w-full bg-slate-950/70 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 ml-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/70 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 transition-all outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            <span>{isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
            {!isSubmitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
          Acceso protegido por Supabase Auth & RLS
        </div>
      </div>
    </div>
  );
};
