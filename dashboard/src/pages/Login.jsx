import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

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
      {/* Textura de fondo: líneas finas tipo mapa de ruta, no blobs difuminados */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(115deg, transparent, transparent 68px, rgb(45 212 191) 68px, rgb(45 212 191) 69px)',
        }}
      />

      <div className="max-w-md w-full surface-glass rounded-lg relative z-10">
        <div className="text-center px-8 pt-8 pb-6 space-y-2">
          <div className="inline-flex items-center justify-center w-11 h-11 bg-teal-600 rounded-md text-white mb-2 btn-neu">
            <Compass className="w-5 h-5" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            Vicka Turismo
          </h1>
          <p className="text-sm text-slate-400">
            Consola de operación · CRM de WhatsApp
          </p>
        </div>

        {/* Perforación estilo boarding pass separando encabezado del formulario */}
        <div className="relative border-t border-dashed border-slate-700">
          <span className="absolute -left-3 -top-2 w-4 h-4 rounded-full bg-slate-950" />
          <span className="absolute -right-3 -top-2 w-4 h-4 rounded-full bg-slate-950" />
        </div>

        <div className="p-8 pt-6 space-y-5">
          {error && (
            <div className="bg-red-950/50 border border-red-900 rounded-md p-3.5 flex items-start space-x-3 text-red-400 text-xs leading-relaxed">
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
                  className="w-full surface-well focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-md py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 transition-colors outline-none"
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
                  className="w-full surface-well focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-md py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 transition-colors outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 px-4 rounded-md text-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2 btn-neu"
            >
              <span>{isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-center text-[11px] font-mono text-slate-500">
            ACCESO PROTEGIDO · SUPABASE AUTH + RLS
          </div>
        </div>
      </div>
    </div>
  );
};
