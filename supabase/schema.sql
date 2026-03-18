-- UtahWindFinder Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database.

-- ── User Preferences ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_lake  TEXT NOT NULL DEFAULT 'utah-lake-zigzag',
  activities    TEXT[] NOT NULL DEFAULT ARRAY['kiting'],
  alerts        JSONB NOT NULL DEFAULT '{
    "windThreshold": 12,
    "glassNotify": true,
    "thermalNotify": true,
    "severeNotify": true,
    "dailyBriefing": true,
    "quietStart": "22:00",
    "quietEnd": "07:00"
  }'::jsonb,
  phone         TEXT,
  units         TEXT NOT NULL DEFAULT 'imperial' CHECK (units IN ('imperial', 'metric')),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Subscriptions ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT,
  tier                   TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  status                 TEXT NOT NULL DEFAULT 'inactive',
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only READ their own subscription.  All writes go through the
-- service-role key (API server) so no client can grant themselves Pro.
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Explicit deny: no INSERT/UPDATE/DELETE via anon or authenticated roles.
-- Only the service_role (API server) bypasses RLS.
CREATE POLICY "Block direct client writes"
  ON subscriptions FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Block direct client updates"
  ON subscriptions FOR UPDATE
  USING (false);

CREATE POLICY "Block direct client deletes"
  ON subscriptions FOR DELETE
  USING (false);

-- Server-side helper: verify a user's tier without exposing the query pattern.
-- The thermal-forecast endpoint calls this as a final gate.
CREATE OR REPLACE FUNCTION public.get_user_tier(uid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT tier FROM subscriptions
     WHERE user_id = uid
       AND status = 'active'
       AND (current_period_end IS NULL OR current_period_end > NOW())
    ),
    'free'
  );
$$;

-- ── Push Notification Subscriptions ─────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL,
  p256dh        TEXT NOT NULL,
  auth_key      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- ── Garmin Device Links ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS garmin_devices (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id     TEXT NOT NULL,
  device_name   TEXT DEFAULT 'Garmin Watch',
  linked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(device_id)
);

ALTER TABLE garmin_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own devices"
  ON garmin_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can link devices"
  ON garmin_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlink devices"
  ON garmin_devices FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_garmin_devices_device_id
  ON garmin_devices(device_id);

CREATE INDEX IF NOT EXISTS idx_garmin_devices_user
  ON garmin_devices(user_id);

-- Server-side helper: check if a Garmin device_id has Pro access
CREATE OR REPLACE FUNCTION public.get_device_tier(did TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT s.tier FROM garmin_devices g
     JOIN subscriptions s ON s.user_id = g.user_id
     WHERE g.device_id = did
       AND s.status = 'active'
       AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
    ),
    'free'
  );
$$;

-- ── Indexes ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions(user_id);

-- ── Updated-at trigger ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_preferences
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_subscriptions
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
