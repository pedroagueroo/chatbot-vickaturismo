-- Migración: Carpetas y subcarpetas para la Biblioteca de Archivos
-- Permite organizar media_library en un árbol de carpetas anidado sin límite de profundidad.

-------------------------------------------------------
-- 1. TABLA: media_folders (auto-referenciada para anidar)
-------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_folders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES media_folders(id) ON DELETE CASCADE,
  name             VARCHAR(255) NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_folders_business ON media_folders(business_id);
CREATE INDEX IF NOT EXISTS idx_media_folders_parent ON media_folders(parent_folder_id);

ALTER TABLE media_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso a media_folders según empresa o Super Admin"
  ON media_folders FOR ALL
  TO authenticated
  USING (business_id = public.current_user_business_id() OR public.is_super_admin());

-------------------------------------------------------
-- 2. MEDIA_LIBRARY: a qué carpeta pertenece cada archivo
-------------------------------------------------------
-- ON DELETE SET NULL: si se borra la carpeta (o su árbol en cascada), el archivo
-- nunca se borra, solo queda "suelto" en la raíz.
ALTER TABLE media_library
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES media_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_media_library_folder ON media_library(folder_id);
