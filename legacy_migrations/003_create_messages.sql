-- MENSAJES
CREATE TABLE IF NOT EXISTS messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role           VARCHAR(10) NOT NULL,
  content        TEXT NOT NULL,
  intent         VARCHAR(50),
  platform_msg_id VARCHAR(200),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
