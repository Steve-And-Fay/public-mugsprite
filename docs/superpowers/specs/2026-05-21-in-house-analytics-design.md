# In-House Analytics — Design

**Date:** 2026-05-21
**Status:** Draft, awaiting approval
**Goal:** Stand up a free, in-stack analytics layer that produces the metrics needed to land Mugsprite's first sponsors, with no third-party scripts and minimal legal overhead.

## Goals

- Quote credible monthly traffic, engagement, and product-activity numbers to prospective sponsors.
- Run entirely on existing Netlify + Neon infrastructure. Zero new vendors.
- Cookieless, banner-free, GDPR/CCPA-comfortable by design.
- Owner-only `/admin` dashboard so the operator can see all metrics in one place.

## Non-goals

- Per-visitor identity across days (cross-day uniques resolve via the daily-rotating hash and are inherently approximate).
- Performance-marketing-grade retention curves or multi-touch attribution.
- A general-purpose product-analytics platform (no event taxonomy, no cohort builder, no SQL editor in-app).
- Real-time live dashboard updates — admin page reads aggregates, not a stream.

## Approach

**Privacy posture (Option C — hybrid):**

- Public pages (landing, FAQ, sponsor, legal): cookieless. Visitors are deduped within a UTC day by `sha256(daily_salt + ip + user_agent)` and never beyond.
- Authenticated/room context (dashboard views, owner actions, MCP calls): identified by `room_id` / `agent_id` already in the DB. These are about the room, not the human, so no PII concerns.
- Daily salt is generated at midnight UTC and stored in a tiny `analytics_salts` table; previous salts are discarded so old hashes cannot be reversed even with future IP knowledge.
- No raw IP, no raw UA, no cookies, no localStorage IDs. Privacy Policy gets a one-line addition.

## Schema (additions to `db/schema.sql`)

```sql
-- Rotating salt used to hash visitor identifiers. New row inserted nightly by
-- the cleanup function. Old salts are kept for 2 days so today's events finish
-- being deduped against yesterday's last hour, then pruned.
CREATE TABLE IF NOT EXISTS analytics_salts (
  day    DATE PRIMARY KEY,
  salt   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Raw pageview events. Pruned after 90 days; rolled up daily into
-- analytics_pageviews_daily by the cleanup function.
CREATE TABLE IF NOT EXISTS analytics_pageviews (
  id            BIGSERIAL PRIMARY KEY,
  visitor_hash  TEXT NOT NULL,          -- sha256(daily_salt + ip + ua)
  path          TEXT NOT NULL,          -- normalized: /r/:roomId, /faq, etc.
  referrer_host TEXT,                   -- bare hostname only, no path/query
  country       TEXT,                   -- ISO 3166-1 alpha-2 from x-nf-geo / cf-ipcountry
  device_class  TEXT NOT NULL,          -- 'mobile' | 'desktop' | 'bot' | 'other'
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_pageviews_created_idx
  ON analytics_pageviews(created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_pageviews_visitor_idx
  ON analytics_pageviews(visitor_hash, created_at DESC);

-- Dashboard dwell-time samples. Posted by the room page every 60s while open.
-- Each row = one heartbeat = ~60s of attention on a specific room.
CREATE TABLE IF NOT EXISTS analytics_dashboard_pings (
  id            BIGSERIAL PRIMARY KEY,
  visitor_hash  TEXT NOT NULL,
  room_id       TEXT NOT NULL,          -- no FK: pings outlive room deletion
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_dashboard_pings_room_idx
  ON analytics_dashboard_pings(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_dashboard_pings_created_idx
  ON analytics_dashboard_pings(created_at DESC);

-- Sponsor click attribution. Hooks into existing /sponsor/click redirect.
CREATE TABLE IF NOT EXISTS analytics_sponsor_clicks (
  id            BIGSERIAL PRIMARY KEY,
  visitor_hash  TEXT NOT NULL,
  source_path   TEXT NOT NULL,          -- the page that hosted the link
  sponsor_slug  TEXT NOT NULL,          -- which sponsor was clicked
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_sponsor_clicks_sponsor_idx
  ON analytics_sponsor_clicks(sponsor_slug, created_at DESC);

-- Daily rollup tables — populated by the cleanup function, kept forever.
-- Raw tables are pruned past 90 days; rollups are the long-term record.
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
  total_pings          INTEGER NOT NULL,   -- sum across all rooms
  unique_visitors      INTEGER NOT NULL,
  unique_rooms_viewed  INTEGER NOT NULL,
  approx_view_seconds  BIGINT  NOT NULL    -- total_pings * 60
);
```

Product activity (rooms created, agents added, MCP tool calls) does **not** need new tables — it's already in `rooms`, `agents`, and `events`. The admin dashboard queries those directly.

## Tracking endpoints

### `POST /api/track/pageview` (edge function)

Body: `{ path: string, referrer?: string, utm?: {source?, medium?, campaign?} }`.

Server: resolves `country` from `x-nf-geo` header (Netlify) with `cf-ipcountry` fallback. Hashes `ip + user-agent` with today's salt. Classifies device from UA (light regex — `mobile` if `Mobi/Android/iPhone`, `bot` if matches a bot allowlist, else `desktop`). Inserts one row. Returns `204 No Content`. No body, no cookies.

Bot filter at insert time: drop rows where `device_class = 'bot'` outright. Don't even store them.

### `POST /api/track/ping` (edge function)

Body: `{ roomId: string }`. Visitor hash + room id inserted. Returns `204`.

Client behavior: the room page fires one ping on mount, then every 60s while the tab is visible (use `document.visibilityState`). Skip pings when hidden so background tabs don't inflate dwell.

### `GET /api/sponsor/click?sponsor=<slug>&from=<path>` (extend existing)

The existing sponsor redirect already exists. Extend it to insert an `analytics_sponsor_clicks` row before redirecting. Keep response time under 50ms — measure and verify.

## Client-side instrumentation

- Add a tiny `useAnalytics()` hook that subscribes to `react-router` location changes and calls `/api/track/pageview` on every route navigation. Skip when route includes `?owner=` (admin views shouldn't pollute their own stats).
- Room page mounts a separate `useDashboardPings(roomId)` hook that handles the 60s heartbeat.
- Both hooks use `navigator.sendBeacon` when available (fire-and-forget, survives page unload), falling back to `fetch` with `keepalive: true`.

Bundle impact: under 1KB minified, no third-party deps.

## Admin dashboard (`/admin`)

- New route gated by a single env var: `ADMIN_TOKEN`. Access via `/admin?token=<token>`. Token set once in Netlify env, never rotated unless leaked.
- Layout: single page, scannable. Three sections:
  1. **Traffic** — total pageviews (today / 7d / 30d), unique visitors, top paths, country split, mobile/desktop, top referrer hosts, UTM campaign breakdown.
  2. **Dashboard engagement** — concurrent room views (last 5 min), avg dwell per visitor (last 7d, derived from pings × 60s), top viewed rooms (anonymized count only — no room slugs).
  3. **Product activity** — rooms created (today / 7d / 30d), agents added, MCP tool call volume by tool name (from `events` table grouped by `kind`).
- Backed by `GET /api/admin/stats` which returns one aggregated JSON. Owner-token auth (the existing admin token, same as page gate).
- Built with the existing React/Tailwind stack. Charts rendered with raw SVG or a tiny charting lib — no extra runtime dep if avoidable.

## Cleanup / rollup

Extend the existing `cleanup.ts` scheduled function:

- Generate tomorrow's salt at 23:55 UTC (so it exists before midnight rollover).
- Delete `analytics_salts` rows older than 2 days.
- Roll up yesterday's `analytics_pageviews` into `analytics_pageviews_daily`.
- Roll up yesterday's `analytics_dashboard_pings` into `analytics_dashboard_daily`.
- Delete raw `analytics_pageviews` and `analytics_dashboard_pings` rows older than 90 days.
- Sponsor click rows are kept raw (low volume).

## Data flow

```
Visitor lands → useAnalytics → POST /api/track/pageview (edge)
  → resolve country, hash IP+UA with today's salt, insert row, 204

Visitor opens room dashboard → useDashboardPings → POST /api/track/ping
  every 60s while visible → insert row, 204

Visitor clicks sponsor → existing /sponsor/click → insert click row
  → 302 redirect to sponsor URL

Operator hits /admin?token=... → GET /api/admin/stats
  → reads from analytics_*_daily + raw last-24h + events table → JSON
  → page renders cards/charts
```

## Cost envelope (Netlify free tier)

- **Edge function invocations** (1M/month free, 3M Pro): pageview track + ping. At 100k visitors/month averaging 5 pages each + 1k room views averaging 10 pings each = 510k edge invocations. Fits free.
- **Function invocations** (125k/month free): admin stats endpoint hits maybe 100 times/month from you alone. Negligible.
- **Neon storage** (0.5GB free): rollup tables grow at ~1KB/day forever. Raw tables capped at 90 days. Steady-state under 50MB easy.
- **Bandwidth** (100GB/month free): each track request is ~200 bytes in, 0 bytes out. Negligible.

Realistic monthly cost at side-project scale: **$0**.

## Error handling

- Track endpoints never block the client. Errors are logged server-side and swallowed client-side. A failed track call must not break the page.
- Admin stats endpoint: any query failure returns `{section: 'error', message}` for that section rather than a full 500, so the rest of the dashboard still renders.
- Cleanup function failure is non-fatal — the next day's run catches up. Alert via existing Netlify function failure log.

## Testing

- **Unit:** UA → device-class classifier, path normalizer (`/r/abc123` → `/r/:roomId`), salt rotation logic.
- **Integration:** POST track endpoints with sample payloads, assert row inserted with expected hash and country. POST with bot UA, assert dropped.
- **E2E (manual for v1):** open landing in a real browser, verify row appears. Open room dashboard, leave tab open 3min, verify 3 ping rows. Click sponsor, verify click row. Hit `/admin?token=...`, verify dashboard renders with non-zero numbers.

## Privacy Policy update (Legal page)

Add a small paragraph:

> Mugsprite collects anonymous, aggregate usage statistics: page views, country (derived from your IP at the moment of request, never stored), and approximate dashboard view duration. Visitors are deduplicated within a single day using a cryptographic hash that rotates every 24 hours; no cookies, no localStorage, no cross-day tracking. We do not store IP addresses or user-agent strings. We do not share data with third-party analytics services.

## Open questions

None at draft time.

## Phasing

Single phase — small enough to ship together. Roughly 6 deliverables:

1. Schema migration + cleanup function changes.
2. Two track edge functions + sponsor-click extension.
3. Client hooks (`useAnalytics`, `useDashboardPings`).
4. Admin stats endpoint.
5. Admin dashboard page.
6. Privacy Policy paragraph + tests.

Estimated effort: a focused day.
