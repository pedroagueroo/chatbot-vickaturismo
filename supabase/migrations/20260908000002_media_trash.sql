-- Migración: Papelera para la Biblioteca de Archivos
-- Al "eliminar" un archivo se marca deleted_at (soft-delete) en vez de borrarlo.
-- Una tarea programada (pg_cron) llama cada hora a la Edge Function `purge-media-trash`,
-- que borra en forma permanente (archivo real en Storage + fila en la tabla) todo lo
-- que lleve más de 72hs marcado como eliminado.

ALTER TABLE media_library
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_media_library_deleted_at ON media_library(deleted_at);

-- Extensiones necesarias para programar la tarea y poder llamar a la Edge Function por HTTP.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- IMPORTANTE: reemplazá TU_SECRETO_AQUI por una cadena larga y aleatoria inventada por vos
-- (la misma que vas a guardar como secret PURGE_SECRET de la Edge Function). Sirve para que
-- solo esta tarea programada pueda invocar la función de purga, nadie más.
SELECT cron.schedule(
  'purge-media-trash-hourly',
  '0 * * * *', -- cada hora, en punto
  $$
  SELECT net.http_post(
    url := 'https://eyvitviyjykgqawuwhzl.supabase.co/functions/v1/purge-media-trash',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-purge-secret', 'TU_SECRETO_AQUI'
    ),
    body := '{}'::jsonb
  );
  $$
);
