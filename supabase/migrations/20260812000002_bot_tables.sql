-- Migración 2: Tablas de Configuración del Bot y FAQs por Empresa

-- 1. Configuración del Bot por Empresa
CREATE TABLE IF NOT EXISTS bot_config (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID UNIQUE NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  agency_name         VARCHAR(255) NOT NULL,
  welcome_msg         TEXT,
  out_of_hours_msg    TEXT,
  business_hours      JSONB,
  contact_info        JSONB,
  bot_personality     TEXT,
  escalation_keywords TEXT[],
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Preguntas Frecuentes (FAQs) por Empresa
CREATE TABLE IF NOT EXISTS faqs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  category    VARCHAR(100),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faqs_business ON faqs(business_id);
