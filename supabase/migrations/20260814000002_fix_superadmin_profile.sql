-- 1. Arreglar el perfil del Super Admin (aguerop47@gmail.com)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Buscamos el ID interno del Super Admin
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'aguerop47@gmail.com';

  IF v_user_id IS NOT NULL THEN
    -- Insertamos su perfil como Super Admin Global (business_id = NULL)
    INSERT INTO public.profiles (id, business_id, email, role, full_name)
    VALUES (v_user_id, NULL, 'aguerop47@gmail.com', 'super_admin', 'Pedro Agüero Super Admin')
    ON CONFLICT (id) DO UPDATE 
    SET role = 'super_admin', business_id = NULL;
  END IF;
END $$;

-- 2. Crear un Trigger para que nunca más vuelva a pasar esto con usuarios nuevos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (new.id, new.email, 'business_admin', 'Nuevo Usuario');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
