-- Migración: contador mensual de uso de Google Speech-to-Text
-- Permite cortar la transcripción de audios antes de superar el free tier de Google (60 min/mes)

CREATE TABLE IF NOT EXISTS stt_usage (
  id           SERIAL PRIMARY KEY,
  year_month   VARCHAR(7) NOT NULL UNIQUE, -- formato 'YYYY-MM'
  seconds_used INT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
