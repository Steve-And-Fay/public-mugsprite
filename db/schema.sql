-- Mugsprite: schema for Netlify DB (managed Neon Postgres)
-- Applied via `npm run db:apply` against $NETLIFY_DATABASE_URL.
-- v1 = anonymous room tokens (Jitsi-style: knowing the slug is enough to view).
-- Future-proofing: rooms.owner_user_id is nullable now; a users table can be added
-- without breaking existing rooms.

CREATE TABLE IF NOT EXISTS rooms (
  id                TEXT PRIMARY KEY,
  owner_token       TEXT NOT NULL,
  -- Shared bearer used by every agent in the room. One token per room, not per
  -- agent — agents distinguish themselves by passing `name` on each tool call.
  agent_join_token  TEXT NOT NULL DEFAULT '',
  owner_user_id     TEXT,
  name              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent migrations.
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS agent_join_token TEXT NOT NULL DEFAULT '';

-- v0.3: explicit expiry timestamp so the lifetime is renewable. Lifetime checks
-- now compare against expires_at instead of (created_at + 7d), and renewal sets
-- expires_at = NOW() + 7d. Backfill existing rows from their original created_at
-- so already-issued rooms don't get a free extension just because we migrated.
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
UPDATE rooms SET expires_at = created_at + interval '7 days' WHERE expires_at IS NULL;
ALTER TABLE rooms ALTER COLUMN expires_at SET NOT NULL;
ALTER TABLE rooms ALTER COLUMN expires_at SET DEFAULT (NOW() + interval '7 days');
CREATE INDEX IF NOT EXISTS rooms_expires_at_idx ON rooms(expires_at);

-- Dropped in v0.2 (sponsorship pivot — no email collection from end users).
-- Idempotent on fresh DBs (DROP COLUMN IF EXISTS is a no-op).
ALTER TABLE rooms DROP COLUMN IF EXISTS owner_email;
ALTER TABLE rooms DROP COLUMN IF EXISTS owner_first_name;
ALTER TABLE rooms DROP COLUMN IF EXISTS marketing_consent;
DROP INDEX IF EXISTS rooms_owner_email_idx;

CREATE UNIQUE INDEX IF NOT EXISTS rooms_agent_join_token_idx
  ON rooms(agent_join_token)
  WHERE agent_join_token <> '';

CREATE INDEX IF NOT EXISTS rooms_owner_user_idx ON rooms(owner_user_id) WHERE owner_user_id IS NOT NULL;
-- (owner_email was dropped in v0.2; matching index is dropped above.)
CREATE INDEX IF NOT EXISTS rooms_last_active_idx ON rooms(last_active_at DESC);

CREATE TABLE IF NOT EXISTS agents (
  id            TEXT PRIMARY KEY,
  room_id       TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL,
  mood          TEXT NOT NULL DEFAULT 'idle',
  status        TEXT,
  left_at       TIMESTAMPTZ,
  last_message  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, name)
);

CREATE INDEX IF NOT EXISTS agents_room_idx ON agents(room_id);

-- Migrations.
ALTER TABLE agents ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;
-- v0.6: owner-set persistent visual traits (mug builder). NULL = built-in face.
ALTER TABLE agents ADD COLUMN IF NOT EXISTS traits JSONB;
-- Dropped in v0.2 (room-scoped bearer; identity is (room_id, name)).
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_agent_token_key;
DROP INDEX IF EXISTS agents_agent_token_key;
ALTER TABLE agents DROP COLUMN IF EXISTS agent_token;
CREATE UNIQUE INDEX IF NOT EXISTS agents_room_id_name_key ON agents(room_id, name);

CREATE TABLE IF NOT EXISTS events (
  id          BIGSERIAL PRIMARY KEY,
  room_id     TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  agent_id    TEXT REFERENCES agents(id) ON DELETE SET NULL,
  kind        TEXT NOT NULL,
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_room_created_idx ON events(room_id, id DESC);

-- Migration: original schema used ON DELETE CASCADE, which wiped the `leave`
-- event the instant the agent row was deleted, so the dashboard never saw it.
-- Switch to SET NULL; the payload carries agentId for client-side reconciliation.
-- Idempotent: drop-then-add resolves to no-op on a fresh DB and a fix on an old one.
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_agent_id_fkey;
ALTER TABLE events ADD CONSTRAINT events_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL;

-- Cap event history per room to last ~500 rows via periodic prune (run from a scheduled function).
-- The cap keeps SSE replay cheap and Postgres storage bounded.

-- v0.3: per-bearer token-bucket rate limiter. token_hash = sha256(bearer) hex
-- so we never store the raw bearer. bucket lets us run independent budgets
-- (e.g. 'mcp_call' high-volume + 'renew' tight). tokens is a float so we can
-- refill fractionally with EXTRACT(EPOCH ...). consumeRate() in db.ts does an
-- atomic UPSERT against this table on every gated call.
CREATE TABLE IF NOT EXISTS rate_limits (
  token_hash   TEXT NOT NULL,
  bucket       TEXT NOT NULL,
  tokens       DOUBLE PRECISION NOT NULL,
  refilled_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (token_hash, bucket)
);

CREATE INDEX IF NOT EXISTS rate_limits_refilled_idx ON rate_limits(refilled_at);

-- v0.4: schema_migrations bookkeeping. Existing schema is additive-only and
-- applied idempotently, so this table is a foundation for explicit versioning
-- going forward, not a retroactive rewrite. Bump the inserted version when a
-- new migration is added below.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES (1) ON CONFLICT DO NOTHING;

-- v0.5 (migration 3): in-house analytics.
--
-- Privacy model: cookieless rolling-salt hash. The salt rotates every UTC
-- day so visitor_hash cannot identify the same person across days. No raw
-- IP, no raw user-agent stored anywhere.
--
-- Retention: raw pageviews and dashboard_pings are pruned after 90 days.
-- Daily rollups are kept forever. Sponsor clicks are kept raw because
-- volume is low and per-click attribution may be referenced by sponsors.
CREATE TABLE IF NOT EXISTS analytics_salts (
  day        DATE PRIMARY KEY,
  salt       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_pageviews (
  id            BIGSERIAL PRIMARY KEY,
  visitor_hash  TEXT NOT NULL,
  path          TEXT NOT NULL,
  referrer_host TEXT,
  country       TEXT,
  device_class  TEXT NOT NULL,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS analytics_pageviews_created_idx
  ON analytics_pageviews(created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_pageviews_visitor_idx
  ON analytics_pageviews(visitor_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS analytics_dashboard_pings (
  id            BIGSERIAL PRIMARY KEY,
  visitor_hash  TEXT NOT NULL,
  room_id       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS analytics_dashboard_pings_room_idx
  ON analytics_dashboard_pings(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_dashboard_pings_created_idx
  ON analytics_dashboard_pings(created_at DESC);

CREATE TABLE IF NOT EXISTS analytics_sponsor_clicks (
  id            BIGSERIAL PRIMARY KEY,
  visitor_hash  TEXT NOT NULL,
  source_path   TEXT NOT NULL,
  sponsor_slug  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS analytics_sponsor_clicks_sponsor_idx
  ON analytics_sponsor_clicks(sponsor_slug, created_at DESC);

-- Long-term rollup tables. The cleanup function aggregates yesterday's raw
-- rows into these every night. Raw rows are then pruned past 90 days; these
-- are the permanent record.
CREATE TABLE IF NOT EXISTS analytics_pageviews_daily (
  day              DATE NOT NULL,
  path             TEXT NOT NULL,
  country          TEXT,
  device_class     TEXT NOT NULL,
  pageviews        INTEGER NOT NULL,
  unique_visitors  INTEGER NOT NULL,
  PRIMARY KEY (day, path, country, device_class)
);

CREATE TABLE IF NOT EXISTS analytics_dashboard_daily (
  day                  DATE PRIMARY KEY,
  total_pings          INTEGER NOT NULL,
  unique_visitors      INTEGER NOT NULL,
  unique_rooms_viewed  INTEGER NOT NULL,
  approx_view_seconds  BIGINT  NOT NULL
);

-- NOTE: version 2 (the agents bubble/progress columns) lives only on
-- feature/richer-signals-timeline. Skipping straight to version 3 on main
-- so the version sequence aligns when that branch is rebased.
INSERT INTO schema_migrations (version) VALUES (3) ON CONFLICT DO NOTHING;
