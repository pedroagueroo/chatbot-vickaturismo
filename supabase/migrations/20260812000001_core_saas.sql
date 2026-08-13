-- Migración 1: Estructura Core SaaS (Multi-Tenant)

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Empresas (Tenants)
CREATE TABLE IF NOT EXISTS businesses (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    VARCHAR(255) NOT NULL,
  whatsapp_phone_number_id VARCHAR(100),
  whatsapp_access_token   TEXT,
  status                  VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Perfiles (Usuarios del Dashboard vinculados a Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE, -- NULL si es super_admin
  email       VARCHAR(255) NOT NULL,
  full_name   VARCHAR(255),
  role        VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'business_admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Funciones Helper para RLS y Consultas
CREATE OR REPLACE FUNCTION public.current_user_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
