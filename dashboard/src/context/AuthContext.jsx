import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estado para Super Admin (Impersonación de empresa)
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);

  useEffect(() => {
    // 1. Obtener la sesión activa inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Escuchar cambios de autenticación
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setBusinesses([]);
        setSelectedBusinessId(null);
        setLoading(false);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('name');
      if (error) throw error;
      setBusinesses(data || []);
      // Si no hay empresa seleccionada aún y hay empresas disponibles, seleccionar la primera
      setSelectedBusinessId((prev) => {
        if (prev && data.some((b) => b.id === prev)) return prev;
        return data.length > 0 ? data[0].id : null;
      });
    } catch (err) {
      console.error('Error cargando empresas en AuthContext:', err);
    }
  };

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, businesses(name, status)')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error.message);
        setProfile(null);
      } else {
        setProfile(data);
        if (data.role === 'super_admin') {
          await fetchBusinesses();
        }
      }
    } catch (err) {
      console.error('Unexpected error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      throw error;
    }
    return data;
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setBusinesses([]);
    setSelectedBusinessId(null);
    setLoading(false);
  };

  const isSuperAdmin = profile?.role === 'super_admin';

  // ID y Nombre efectivo de la empresa en uso
  const currentBusinessId = isSuperAdmin
    ? selectedBusinessId
    : profile?.business_id;

  const currentBusinessObject = isSuperAdmin
    ? businesses.find((b) => b.id === selectedBusinessId)
    : profile?.businesses;

  const currentBusinessName = isSuperAdmin
    ? currentBusinessObject?.name || 'Vicka Turismo'
    : profile?.businesses?.name || 'Mi Empresa';

  const value = {
    user,
    profile,
    loading,
    login,
    logout,
    isSuperAdmin,
    businessId: currentBusinessId,
    businessName: currentBusinessName,
    activeBusiness: currentBusinessObject,
    businesses,
    selectedBusinessId,
    setSelectedBusinessId,
    reloadBusinesses: fetchBusinesses,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};

