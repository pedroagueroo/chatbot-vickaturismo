-- Migración 4: Políticas de Seguridad de Nivel de Fila (Row Level Security - RLS)

-- Habilitar RLS en todas las tablas
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-------------------------------------------------------
-- POLÍTICAS PARA: businesses
-------------------------------------------------------
CREATE POLICY "Super Admins tienen acceso total a empresas"
  ON businesses FOR ALL
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Business Admins leen su propia empresa"
  ON businesses FOR SELECT
  TO authenticated
  USING (id = public.current_user_business_id());

-------------------------------------------------------
-- POLÍTICAS PARA: profiles
-------------------------------------------------------
CREATE POLICY "Usuarios ven su propio perfil o Super Admins ven todos"
  ON profiles FOR ALL
  TO authenticated
  USING (id = auth.uid() OR public.is_super_admin());

-------------------------------------------------------
-- POLÍTICAS PARA: bot_config
-------------------------------------------------------
CREATE POLICY "Acceso a bot_config según empresa o Super Admin"
  ON bot_config FOR ALL
  TO authenticated
  USING (business_id = public.current_user_business_id() OR public.is_super_admin());

-------------------------------------------------------
-- POLÍTICAS PARA: faqs
-------------------------------------------------------
CREATE POLICY "Acceso a faqs según empresa o Super Admin"
  ON faqs FOR ALL
  TO authenticated
  USING (business_id = public.current_user_business_id() OR public.is_super_admin());

-------------------------------------------------------
-- POLÍTICAS PARA: customers
-------------------------------------------------------
CREATE POLICY "Acceso a clientes según empresa o Super Admin"
  ON customers FOR ALL
  TO authenticated
  USING (business_id = public.current_user_business_id() OR public.is_super_admin());

-------------------------------------------------------
-- POLÍTICAS PARA: conversations
-------------------------------------------------------
CREATE POLICY "Acceso a conversaciones según empresa o Super Admin"
  ON conversations FOR ALL
  TO authenticated
  USING (business_id = public.current_user_business_id() OR public.is_super_admin());

-------------------------------------------------------
-- POLÍTICAS PARA: messages
-------------------------------------------------------
CREATE POLICY "Acceso a mensajes según empresa o Super Admin"
  ON messages FOR ALL
  TO authenticated
  USING (business_id = public.current_user_business_id() OR public.is_super_admin());
