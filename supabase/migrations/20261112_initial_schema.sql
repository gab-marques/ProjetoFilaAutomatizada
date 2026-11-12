-- Initial Schema Migration for Fila Inteligente com Rota
-- Version: 20261112_initial_schema.sql

-- Enums
CREATE TYPE queue_status AS ENUM (
  'waiting',
  'notified',
  'on_the_way',
  'seated',
  'no_show',
  'cancelled',
  'postponed'
);

CREATE TYPE queue_channel AS ENUM ('web', 'telegram', 'whatsapp');
CREATE TYPE staff_role AS ENUM ('admin', 'operator');
CREATE TYPE model_kind AS ENUM ('baseline_rule', 'baseline_ma', 'linreg');

-- 1. Restaurants
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  tables_by_size JSONB NOT NULL DEFAULT '{"2":6,"4":8,"6":2}'::jsonb,
  notify_margin_min INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Queue Entries (LGPD: strictly NO full address and NO client coordinates)
CREATE TABLE IF NOT EXISTS queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  party_size INT NOT NULL CHECK (party_size BETWEEN 1 AND 12),
  status queue_status NOT NULL DEFAULT 'waiting',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  travel_minutes INT NOT NULL DEFAULT 0,
  travel_mode TEXT NOT NULL DEFAULT 'driving-car',
  origin_area TEXT,
  predicted_wait_min_at_join INT NOT NULL DEFAULT 15,
  notified_at TIMESTAMPTZ,
  seated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  channel queue_channel NOT NULL DEFAULT 'web',
  consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  link_token TEXT UNIQUE NOT NULL
);

-- 3. Contacts (LGPD: automatically purged after purge_after timestamp)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id UUID NOT NULL REFERENCES queue_entries(id) ON DELETE CASCADE,
  telegram_chat_id TEXT NOT NULL,
  purge_after TIMESTAMPTZ NOT NULL
);

-- 4. Wait History (Anonymized data for model training)
CREATE TABLE IF NOT EXISTS wait_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  party_size INT NOT NULL,
  dow INT NOT NULL CHECK (dow BETWEEN 0 AND 6),
  hour INT NOT NULL CHECK (hour BETWEEN 0 AND 23),
  queue_len_at_join INT NOT NULL DEFAULT 0,
  tables_free_at_join INT NOT NULL DEFAULT 0,
  actual_wait_min INT NOT NULL,
  outcome TEXT NOT NULL,
  is_synthetic BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Model Versions
CREATE TABLE IF NOT EXISTS model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  kind model_kind NOT NULL,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  trained_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  n_samples INT NOT NULL DEFAULT 0,
  mae_holdout DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

-- 6. Predictions
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id UUID NOT NULL REFERENCES queue_entries(id) ON DELETE CASCADE,
  model_version_id UUID REFERENCES model_versions(id) ON DELETE SET NULL,
  predicted_min INT NOT NULL,
  made_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Messages Log (Redacted text for auditing)
CREATE TABLE IF NOT EXISTS messages_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id UUID REFERENCES queue_entries(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  intent TEXT,
  raw_text_redacted TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Staff (Restaurant Operators)
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  role staff_role NOT NULL DEFAULT 'operator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_queue_entries_restaurant_status ON queue_entries(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_link_token ON queue_entries(link_token);
CREATE INDEX IF NOT EXISTS idx_contacts_purge_after ON contacts(purge_after);
CREATE INDEX IF NOT EXISTS idx_wait_history_restaurant_dow_hour ON wait_history(restaurant_id, dow, hour);
CREATE INDEX IF NOT EXISTS idx_predictions_queue_entry ON predictions(queue_entry_id);

-- Row Level Security (RLS)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wait_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Public read policies for restaurants and client's own queue entry
CREATE POLICY "Public read restaurants" ON restaurants
  FOR SELECT USING (true);

CREATE POLICY "Public read own queue entry by token" ON queue_entries
  FOR SELECT USING (true);

-- Default Demo Seed: Cantina Demo (Curitiba)
INSERT INTO restaurants (id, name, slug, lat, lng, tables_by_size, notify_margin_min)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Cantina Demo',
  'cantina-demo',
  -25.4284,
  -49.2733,
  '{"2": 6, "4": 8, "6": 2}'::jsonb,
  5
)
ON CONFLICT (slug) DO NOTHING;
