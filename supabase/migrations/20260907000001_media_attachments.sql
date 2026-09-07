-- Migración: Adjuntos multimedia (fotos, audios, PDFs) por WhatsApp
-- Agrega: bucket de Storage compartido, biblioteca de archivos reutilizable,
-- y columnas de media en los mensajes.

-------------------------------------------------------
-- 1. BUCKET DE STORAGE
-------------------------------------------------------
-- Público para lectura: Meta necesita descargar el archivo por URL sin auth.
-- Las escrituras están restringidas por las políticas de storage.objects más abajo.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  26214400, -- 25MB
  ARRAY[
    'image/jpeg', 'image/png',
    'audio/mpeg', 'audio/ogg', 'audio/aac', 'audio/amr', 'audio/mp4',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Las rutas de objetos son {business_id}/uploads/... o {business_id}/library/...
-- (storage.foldername(name))[1] es el primer segmento de la ruta = business_id.

CREATE POLICY "Lectura pública de chat-media"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'chat-media');

CREATE POLICY "Subida a chat-media según empresa o Super Admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (
      (storage.foldername(name))[1]::uuid = public.current_user_business_id()
      OR public.is_super_admin()
    )
  );

CREATE POLICY "Actualización de chat-media según empresa o Super Admin"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (
      (storage.foldername(name))[1]::uuid = public.current_user_business_id()
      OR public.is_super_admin()
    )
  );

CREATE POLICY "Borrado de chat-media según empresa o Super Admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (
      (storage.foldername(name))[1]::uuid = public.current_user_business_id()
      OR public.is_super_admin()
    )
  );

-------------------------------------------------------
-- 2. TABLA: media_library (biblioteca de archivos reutilizables)
-------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_library (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  media_type  VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'audio', 'document')),
  file_url    TEXT NOT NULL,
  file_name   VARCHAR(255),
  mime_type   VARCHAR(100),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_library_business ON media_library(business_id);

ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso a media_library según empresa o Super Admin"
  ON media_library FOR ALL
  TO authenticated
  USING (business_id = public.current_user_business_id() OR public.is_super_admin());

-------------------------------------------------------
-- 3. MENSAJES: columnas para adjuntos multimedia
-------------------------------------------------------
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS media_url  TEXT,
  ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) CHECK (media_type IN ('image', 'audio', 'document')),
  ADD COLUMN IF NOT EXISTS file_name  VARCHAR(255);
