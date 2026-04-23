-- USUARIOS
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      VARCHAR(20) NOT NULL,
  platform_id   VARCHAR(100) NOT NULL,
  name          VARCHAR(255),
  phone         VARCHAR(50),
  profile_pic   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, platform_id)
);
