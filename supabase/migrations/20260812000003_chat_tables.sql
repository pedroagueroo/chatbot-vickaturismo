-- Migración 3: Tablas de Chat y CRM (customers, conversations, messages)

-- 1. Clientes de WhatsApp por Empresa
CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  platform    VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  platform_id VARCHAR(100) NOT NULL,
  name        VARCHAR(255),
  phone       VARCHAR(50),
  profile_pic TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, platform, platform_id)
);

-- 2. Conversaciones por Empresa
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  platform    VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  status      VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'escalated', 'closed')),
  agent_id    UUID,
  agent_notes TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Mensajes por Conversación
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  intent          VARCHAR(50),
  platform_msg_id VARCHAR(200),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_conversations_business ON conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_business ON messages(business_id);
