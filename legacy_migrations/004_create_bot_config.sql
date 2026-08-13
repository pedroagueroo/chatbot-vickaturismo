-- CONFIGURACIÓN DEL BOT
CREATE TABLE IF NOT EXISTS bot_config (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name    VARCHAR(255) NOT NULL,
  welcome_msg    TEXT,
  out_of_hours_msg TEXT,
  business_hours JSONB,
  contact_info   JSONB,
  bot_personality TEXT,
  escalation_keywords TEXT[],
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
