-- CONVERSACIONES
CREATE TABLE IF NOT EXISTS conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  platform      VARCHAR(20) NOT NULL,
  status        VARCHAR(20) DEFAULT 'active',
  agent_id      UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
