import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500 mb-3" />
        <p className="text-sm font-medium">Cargando perfil y credenciales...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && profile && !allowedRoles.includes(profile.role)) {
    // Si es super_admin redirige a su panel, si es business_admin al CRM
    const fallbackPath = profile.role === 'super_admin' ? '/admin' : '/crm';
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
};
