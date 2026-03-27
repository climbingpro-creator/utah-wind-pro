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

-- ── Spots (Matches web app lake config system) ─────────────────

CREATE TABLE IF NOT EXISTS spots (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  safe_wind_arc JSONB
);

INSERT INTO spots (slug, name, latitude, longitude, safe_wind_arc) VALUES
  ('lincoln-beach',  'Lincoln Beach',  40.3020, -111.8810, '[270, 90]'),
  ('sandy-beach',    'Sandy Beach',    40.2580, -111.7920, '[270, 90]'),
  ('vineyard',       'Vineyard',       40.3100, -111.7480, '[180, 360]'),
  ('zig-zag',        'Zig Zag',        40.2900, -111.8200, '[0, 180]'),
  ('american-fork',  'American Fork',  40.3350, -111.7870, '[90, 270]'),
  ('deer-creek',     'Deer Creek',     40.4097, -111.5097, '[160, 240]'),
  ('willard-bay',    'Willard Bay',    41.3686, -112.0772, '[160, 240]'),
  ('yuba',           'Yuba',           39.4265, -111.9155, '[140, 220]'),
  ('sand-hollow',    'Sand Hollow',    37.1077, -113.3967, '[320, 45]')
ON CONFLICT (slug) DO NOTHING;

-- ── Kite Sessions (Garmin watch uploads) ────────────────────────

CREATE TABLE IF NOT EXISTS kite_sessions (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id          TEXT,
  spot_id            UUID REFERENCES spots(id) ON DELETE SET NULL,
  rider_name         TEXT,
  gear_setup         TEXT,
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_s         INTEGER NOT NULL DEFAULT 0,
  distance_nm        DOUBLE PRECISION DEFAULT 0,
  max_speed_kts      DOUBLE PRECISION DEFAULT 0,
  avg_speed_kts      DOUBLE PRECISION DEFAULT 0,
  calories           INTEGER DEFAULT 0,
  avg_hr             INTEGER DEFAULT 0,
  max_hr             INTEGER DEFAULT 0,
  total_jumps        INTEGER DEFAULT 0,
  max_jump_ft        DOUBLE PRECISION DEFAULT 0,
  avg_jump_ft        DOUBLE PRECISION DEFAULT 0,
  max_hangtime_s     DOUBLE PRECISION DEFAULT 0,
  crashes_filtered   INTEGER DEFAULT 0,
  water_temp_c       DOUBLE PRECISION,
  track              JSONB,
  fit_file_url       TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE kite_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions"
  ON kite_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public can read sessions for day pages"
  ON kite_sessions FOR SELECT
  USING (true);

CREATE POLICY "Service role inserts sessions"
  ON kite_sessions FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_kite_sessions_user
  ON kite_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_kite_sessions_device
  ON kite_sessions(device_id);

CREATE INDEX IF NOT EXISTS idx_kite_sessions_spot
  ON kite_sessions(spot_id);

CREATE INDEX IF NOT EXISTS idx_kite_sessions_started
  ON kite_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_kite_sessions_spot_date
  ON kite_sessions(spot_id, (started_at::date));

-- ── Individual Jumps (for deep-dive charts / leaderboards) ──────

CREATE TABLE IF NOT EXISTS jumps (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id        UUID REFERENCES kite_sessions(id) ON DELETE CASCADE NOT NULL,
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  jump_number       INTEGER NOT NULL DEFAULT 1,
  height_ft         DOUBLE PRECISION NOT NULL,
  hangtime_s        DOUBLE PRECISION NOT NULL,
  distance_ft       DOUBLE PRECISION,
  takeoff_speed_kts DOUBLE PRECISION,
  peak_g            DOUBLE PRECISION
);

ALTER TABLE jumps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own jumps"
  ON jumps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kite_sessions s
      WHERE s.id = jumps.session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can read jumps for day pages"
  ON jumps FOR SELECT
  USING (true);

CREATE POLICY "Service role inserts jumps"
  ON jumps FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_jumps_session
  ON jumps(session_id);

CREATE INDEX IF NOT EXISTS idx_jumps_height
  ON jumps(height_ft DESC);

-- ── Emergency Location Alerts ───────────────────────────────────

CREATE TABLE IF NOT EXISTS emergency_alerts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id   TEXT,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  alert_type  TEXT NOT NULL DEFAULT 'KITE_EMERGENCY',
  message     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_alerts_created
  ON emergency_alerts(created_at DESC);

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
