-- FAQs
CREATE TABLE IF NOT EXISTS faqs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question       TEXT NOT NULL,
  answer         TEXT NOT NULL,
  category       VARCHAR(100),
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
