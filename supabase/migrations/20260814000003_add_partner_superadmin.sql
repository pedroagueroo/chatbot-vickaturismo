-- 1. Actualizar el perfil del socio a Super Admin
UPDATE public.profiles
SET 
  role = 'super_admin',
  business_id = NULL,
  full_name = 'Socio de Pedro'
WHERE email = 'videlapetito@gmail.com';
