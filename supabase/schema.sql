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
  -- Original kite / water spots
  ('lincoln-beach',  'Lincoln Beach',  40.3020, -111.8810, '[270, 90]'),
  ('sandy-beach',    'Sandy Beach',    40.2580, -111.7920, '[270, 90]'),
  ('vineyard',       'Vineyard',       40.3100, -111.7480, '[180, 360]'),
  ('zig-zag',        'Zig Zag',        40.2900, -111.8200, '[0, 180]'),
  ('american-fork',  'American Fork',  40.3350, -111.7870, '[90, 270]'),
  ('deer-creek',     'Deer Creek',     40.4097, -111.5097, '[160, 240]'),
  ('willard-bay',    'Willard Bay',    41.3686, -112.0772, '[160, 240]'),
  ('yuba',           'Yuba',           39.4265, -111.9155, '[140, 220]'),
  ('sand-hollow',    'Sand Hollow',    37.1077, -113.3967, '[320, 45]'),
  -- Kite extras
  ('rush-lake',      'Rush Lake',      40.5300, -112.3600, NULL),
  ('grantsville',    'Grantsville Reservoir', 40.5800, -112.4800, NULL),
  -- Snowkite spots
  ('strawberry-reservoir', 'Strawberry Reservoir', 40.1700, -111.1500, NULL),
  ('skyline-drive',  'Skyline Drive',  39.6700, -111.3700, NULL),
  ('powder-mountain','Powder Mountain', 41.3800, -111.7800, NULL),
  ('monte-cristo',   'Monte Cristo',   41.4600, -111.5000, NULL),
  -- Paragliding sites
  ('potm-south',     'Point of the Mountain South', 40.4500, -111.9100, NULL),
  ('potm-north',     'Point of the Mountain North', 40.4600, -111.9100, NULL),
  ('inspiration-point','Inspiration Point', 40.2600, -111.6300, NULL),
  ('west-mountain',  'West Mountain',  40.1200, -111.7700, NULL),
  ('stockton-bar',   'Stockton Bar',   40.4500, -112.3700, NULL),
  -- Regional lakes (fishing / boating / paddling)
  ('pineview',       'Pineview Reservoir', 41.2500, -111.8000, NULL),
  ('jordanelle',     'Jordanelle',     40.6000, -111.4300, NULL),
  ('east-canyon',    'East Canyon',    40.8700, -111.5900, NULL),
  ('echo',           'Echo Reservoir', 40.9700, -111.4400, NULL),
  ('rockport',       'Rockport',       40.7700, -111.4000, NULL),
  ('bear-lake',      'Bear Lake',      41.9500, -111.3300, NULL),
  ('hyrum',          'Hyrum Reservoir', 41.6300, -111.8700, NULL),
  ('starvation',     'Starvation Reservoir', 40.1900, -110.4500, NULL),
  ('flaming-gorge',  'Flaming Gorge',  40.9200, -109.5300, NULL),
  ('steinaker',      'Steinaker',      40.5200, -109.5400, NULL),
  ('red-fleet',      'Red Fleet',      40.5700, -109.4700, NULL),
  ('scofield',       'Scofield',       39.7800, -111.1500, NULL),
  ('otter-creek',    'Otter Creek',    38.2100, -111.9300, NULL),
  ('fish-lake',      'Fish Lake',      38.5400, -111.7000, NULL),
  ('minersville',    'Minersville',    38.2200, -112.8800, NULL),
  ('lake-powell',    'Lake Powell',    37.0700, -111.2400, NULL),
  ('quail-creek',    'Quail Creek',    37.2000, -113.3800, NULL),
  ('mantua',         'Mantua Reservoir', 41.4900, -111.9500, NULL),
  ('lost-creek',     'Lost Creek',     41.0200, -111.3700, NULL),
  ('causey',         'Causey Reservoir', 41.2800, -111.5800, NULL),
  ('panguitch',      'Panguitch Lake', 37.7200, -112.6400, NULL),
  ('piute',          'Piute Reservoir', 38.3200, -112.1400, NULL)
ON CONFLICT (slug) DO NOTHING;

-- ── Sessions (Garmin watch uploads + web form) ─────────────────

CREATE TABLE IF NOT EXISTS kite_sessions (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id          TEXT,
  spot_id            UUID REFERENCES spots(id) ON DELETE SET NULL,
  activity_type      TEXT NOT NULL DEFAULT 'kiting',
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
  ride_count         INTEGER DEFAULT 0,
  foil_ride_count    INTEGER DEFAULT 0,
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

CREATE POLICY "Service role updates sessions"
  ON kite_sessions FOR UPDATE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_kite_sessions_user
  ON kite_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_kite_sessions_device
  ON kite_sessions(device_id);

CREATE INDEX IF NOT EXISTS idx_kite_sessions_spot
  ON kite_sessions(spot_id);

CREATE INDEX IF NOT EXISTS idx_kite_sessions_started
  ON kite_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_kite_sessions_activity
  ON kite_sessions(activity_type);

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

-- ── Session Photos (user-uploaded images per session) ──────────

CREATE TABLE IF NOT EXISTS session_photos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID REFERENCES kite_sessions(id) ON DELETE CASCADE NOT NULL,
  photo_url   TEXT NOT NULL,
  caption     TEXT,
  is_cover    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE session_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read session photos"
  ON session_photos FOR SELECT
  USING (true);

CREATE POLICY "Service role inserts session photos"
  ON session_photos FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_session_photos_session
  ON session_photos(session_id);

-- ── Fish Catches (per-session catch log for fishing) ───────────

CREATE TABLE IF NOT EXISTS fish_catches (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID REFERENCES kite_sessions(id) ON DELETE CASCADE NOT NULL,
  species     TEXT,
  weight_lbs  DOUBLE PRECISION,
  length_in   DOUBLE PRECISION,
  photo_url   TEXT,
  method      TEXT DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fish_catches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read fish catches"
  ON fish_catches FOR SELECT
  USING (true);

CREATE POLICY "Service role inserts fish catches"
  ON fish_catches FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fish_catches_session
  ON fish_catches(session_id);

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

-- ── Nearest Spot RPC (used by session-upload to match GPS → spot) ──

CREATE OR REPLACE FUNCTION nearest_spot(p_lat DOUBLE PRECISION, p_lon DOUBLE PRECISION)
RETURNS TABLE(id UUID, name TEXT, distance DOUBLE PRECISION)
LANGUAGE sql STABLE AS $$
  SELECT s.id, s.name,
    sqrt(power(s.latitude - p_lat, 2) + power(s.longitude - p_lon, 2)) AS distance
  FROM spots s
  WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL
  ORDER BY distance
  LIMIT 1;
$$;

-- ── Weather Stations (Ambient Weather meters with GPS coordinates) ──

CREATE TABLE IF NOT EXISTS weather_stations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mac_address   TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  elevation_ft  INTEGER,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with our known Ambient Weather stations
INSERT INTO weather_stations (mac_address, name, latitude, longitude, elevation_ft) VALUES
  ('48:3F:DA:54:2C:6E', 'Saratoga Springs PWS', 40.3500, -111.9000, 4500)
ON CONFLICT (mac_address) DO NOTHING;

-- RPC: Find nearest weather station to a coordinate
-- Returns the closest station within a given radius (in degrees, ~69 mi per degree)
CREATE OR REPLACE FUNCTION nearest_weather_station(p_lat DOUBLE PRECISION, p_lon DOUBLE PRECISION, p_radius_deg DOUBLE PRECISION DEFAULT 0.5)
RETURNS TABLE(id UUID, mac_address TEXT, name TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, distance_deg DOUBLE PRECISION)
LANGUAGE sql STABLE AS $$
  SELECT 
    ws.id, 
    ws.mac_address, 
    ws.name, 
    ws.latitude, 
    ws.longitude,
    sqrt(power(ws.latitude - p_lat, 2) + power(ws.longitude - p_lon, 2)) AS distance_deg
  FROM weather_stations ws
  WHERE ws.is_active = true
    AND sqrt(power(ws.latitude - p_lat, 2) + power(ws.longitude - p_lon, 2)) <= p_radius_deg
  ORDER BY distance_deg
  LIMIT 1;
$$;

CREATE INDEX IF NOT EXISTS idx_weather_stations_coords
  ON weather_stations(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_weather_stations_active
  ON weather_stations(is_active) WHERE is_active = true;

-- ── Session Alerts (Pro feature) ──────────────────────────────
-- Per-spot, per-discipline alert subscriptions.
-- Cron watcher evaluates forecasts and notifies via SMS/push.

CREATE TABLE IF NOT EXISTS session_alerts (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spot_id                 TEXT NOT NULL,
  discipline              TEXT NOT NULL,
  min_wind_mph            INTEGER NOT NULL DEFAULT 8,
  enabled                 BOOLEAN NOT NULL DEFAULT true,
  last_notified_at        TIMESTAMPTZ,
  last_window_fingerprint TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, spot_id, discipline)
);

ALTER TABLE session_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own session alerts"
  ON session_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session alerts"
  ON session_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own session alerts"
  ON session_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own session alerts"
  ON session_alerts FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_session_alerts_enabled
  ON session_alerts(enabled) WHERE enabled = true;

-- ══════════════════════════════════════════════════════════════
-- Community Posts — user-submitted catch photos and reports
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS community_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email      TEXT,
  display_name    TEXT,
  photo_url       TEXT NOT NULL,
  caption         TEXT,
  location_id     TEXT,
  location_name   TEXT,
  species         TEXT,
  likes           INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community posts"
  ON community_posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert own posts"
  ON community_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON community_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON community_posts FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_posts_created
  ON community_posts(created_at DESC);

-- ══════════════════════════════════════════════════════════════
-- Condition Reports — crowd-sourced weather accuracy votes
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS condition_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     TEXT NOT NULL,
  vote            TEXT NOT NULL CHECK (vote IN ('lighter', 'spot-on', 'stronger')),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE condition_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert condition reports"
  ON condition_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read condition reports"
  ON condition_reports FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_condition_reports_location_time
  ON condition_reports(location_id, created_at DESC);

-- Add weather-at-catch columns to community_posts
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS weather_temp   INTEGER;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS weather_wind   INTEGER;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS weather_sky    TEXT CHECK (weather_sky IN ('sunny', 'partly-cloudy', 'overcast', 'rain', 'snow'));

-- ══════════════════════════════════════════════════════════════
-- Community Post Likes — one like per user per post
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS community_post_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE community_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read likes"
  ON community_post_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert own likes"
  ON community_post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON community_post_likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_likes_post
  ON community_post_likes(post_id);

-- ══════════════════════════════════════════════════════════════
-- Community Post Comments
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS community_post_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  body         TEXT NOT NULL CHECK (char_length(body) <= 500),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE community_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON community_post_comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert own comments"
  ON community_post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON community_post_comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_comments_post
  ON community_post_comments(post_id, created_at ASC);

-- ══════════════════════════════════════════════════════════════
-- Favorite Locations — server-synced favorites for Pro alerts
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS favorite_locations (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id  TEXT NOT NULL,
  notify       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

ALTER TABLE favorite_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own favorites"
  ON favorite_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON favorite_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorites"
  ON favorite_locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorite_locations FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_favorite_locations_user
  ON favorite_locations(user_id);

CREATE INDEX IF NOT EXISTS idx_favorite_locations_notify
  ON favorite_locations(user_id, notify) WHERE notify = true;

-- ══════════════════════════════════════════════════════════════
-- Alert Log — dedup/throttle fishing alert dispatch
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS alert_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type   TEXT NOT NULL CHECK (alert_type IN ('hatch', 'pressure', 'glass', 'stocking', 'morning', 'weekend')),
  location_id  TEXT,
  channel      TEXT NOT NULL DEFAULT 'push' CHECK (channel IN ('push', 'email')),
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own alert log"
  ON alert_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_alert_log_dedup
  ON alert_log(user_id, alert_type, location_id, sent_at DESC);

-- ══════════════════════════════════════════════════════════════
-- Catch Log — Pro Smart Catch Journal (Phase 2)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS catch_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id         TEXT NOT NULL,
  species             TEXT,
  photo_url           TEXT,
  caught_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lat                 DOUBLE PRECISION,
  lng                 DOUBLE PRECISION,
  notes               TEXT,
  wind_speed          DOUBLE PRECISION,
  wind_direction      DOUBLE PRECISION,
  wind_gust           DOUBLE PRECISION,
  air_temp            DOUBLE PRECISION,
  water_temp          DOUBLE PRECISION,
  barometric_pressure DOUBLE PRECISION,
  pressure_trend      TEXT CHECK (pressure_trend IN ('rising', 'falling', 'stable')),
  cloud_cover         INTEGER,
  flow_cfs            DOUBLE PRECISION,
  moon_phase          TEXT,
  hatch_prediction    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE catch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own catch log"
  ON catch_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own catches"
  ON catch_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own catches"
  ON catch_log FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own catches"
  ON catch_log FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_catch_log_user
  ON catch_log(user_id, caught_at DESC);

CREATE INDEX IF NOT EXISTS idx_catch_log_location
  ON catch_log(location_id, caught_at DESC);

CREATE INDEX IF NOT EXISTS idx_catch_log_species
  ON catch_log(user_id, species);
