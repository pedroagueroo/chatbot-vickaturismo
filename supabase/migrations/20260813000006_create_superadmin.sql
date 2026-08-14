-- Habilitar la extensión de encriptación por si no está activa
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_business_id uuid;
BEGIN
  -- 1. Obtener el ID del primer negocio (Ej: Vicka Turismo) que creamos en el seed
  SELECT id INTO v_business_id FROM public.businesses LIMIT 1;

  -- 2. Eliminar el usuario si ya existe (para evitar errores si corrés esto dos veces)
  DELETE FROM auth.users WHERE email = 'aguerop47@gmail.com';

  -- 3. Insertar el usuario forzado en la tabla interna de Supabase Auth
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'aguerop47@gmail.com',
    crypt('Pola123.', gen_salt('bf')), -- Encripta la contraseña de forma segura
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

  -- 4. Crear su identidad (requerido por Supabase)
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    format('{"sub":"%s","email":"%s"}', v_user_id, 'aguerop47@gmail.com')::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  -- 5. Hardcodear el rol super_admin en nuestra tabla de perfiles (SaaS)
  INSERT INTO public.profiles (id, business_id, role, full_name)
  VALUES (v_user_id, v_business_id, 'super_admin', 'Pedro Agüero');

END $$;
