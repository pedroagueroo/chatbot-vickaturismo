-- Habilitar la actualización (UPDATE) de la tabla businesses para los dueños de agencia
BEGIN;

DROP POLICY IF EXISTS "Business Admins actualizan su propia empresa" ON businesses;

CREATE POLICY "Business Admins actualizan su propia empresa"
  ON businesses FOR UPDATE
  TO authenticated
  USING (id = public.current_user_business_id())
  WITH CHECK (id = public.current_user_business_id());

COMMIT;
