import { neon } from '@netlify/neon';

// In-house analytics queries used by the regular (non-edge) Netlify functions:
// sponsor click attribution, cleanup rollups, and the admin stats endpoint.
//
// The two track endpoints are EDGE functions and import @netlify/neon via the
// esm.sh URL; they use a separate small helper module to avoid pulling in this
// module's regular-function imports.

const sql = neon();

export interface SaltRow {
  day: string;
  salt: string;
}

// Returns today's salt, generating it on first call. Idempotent: parallel
// inserts on the same day resolve via the unique key — whichever INSERT wins
// is the canonical salt; the loser SELECTs and uses it. Cleanup function
// pre-generates tomorrow's salt nightly so the common path is the cheap SELECT.
export async function getOrCreateTodaysSalt(candidate: string): Promise<string> {
  const inserted = (await sql`
    INSERT INTO analytics_salts (day, salt)
    VALUES (CURRENT_DATE, ${candidate})
    ON CONFLICT (day) DO NOTHING
    RETURNING salt
  `) as Array<{ salt: string }>;
  if (inserted[0]) return inserted[0].salt;
  const existing = (await sql`
    SELECT salt FROM analytics_salts WHERE day = CURRENT_DATE LIMIT 1
  `) as Array<{ salt: string }>;
  // existing[0] is non-null: either we just lost the insert race (someone
  // else inserted) or the salt was pre-created by the nightly cleanup job.
  return existing[0]!.salt;
}

export async function insertSponsorClick(params: {
  visitorHash: string;
  sourcePath: string;
  sponsorSlug: string;
}): Promise<void> {
  await sql`
    INSERT INTO analytics_sponsor_clicks (visitor_hash, source_path, sponsor_slug)
    VALUES (${params.visitorHash}, ${params.sourcePath}, ${params.sponsorSlug})
  `;
}

// ---- Cleanup-side helpers ----

// Generate tomorrow's salt so the track endpoint never has to bootstrap
// at midnight UTC under traffic. No-op if it already exists.
export async function preGenerateTomorrowsSalt(salt: string): Promise<void> {
  await sql`
    INSERT INTO analytics_salts (day, salt)
    VALUES (CURRENT_DATE + interval '1 day', ${salt})
    ON CONFLICT (day) DO NOTHING
  `;
}

// Prune salts older than 2 days. Today's request hashes will only ever
// reference today's salt, but we keep yesterday to make late-arriving pings
// from a tab open across midnight still deduplicate sensibly.
export async function pruneOldSalts(): Promise<number> {
  const rows = (await sql`
    DELETE FROM analytics_salts WHERE day < CURRENT_DATE - interval '2 days'
    RETURNING day
  `) as Array<{ day: string }>;
  return rows.length;
}

// Aggregate yesterday's raw pageviews into the daily rollup. Idempotent via
// the composite PK + ON CONFLICT DO UPDATE; safe to re-run if cleanup retries.
export async function rollupYesterdaysPageviews(): Promise<number> {
  const rows = (await sql`
    INSERT INTO analytics_pageviews_daily (day, path, country, device_class, pageviews, unique_visitors)
    SELECT
      (created_at AT TIME ZONE 'UTC')::date AS day,
      path,
      country,
      device_class,
      COUNT(*)::int AS pageviews,
      COUNT(DISTINCT visitor_hash)::int AS unique_visitors
    FROM analytics_pageviews
    WHERE created_at >= (CURRENT_DATE - interval '1 day')::timestamptz
      AND created_at <  CURRENT_DATE::timestamptz
    GROUP BY 1, 2, 3, 4
    ON CONFLICT (day, path, country, device_class) DO UPDATE
      SET pageviews = EXCLUDED.pageviews,
          unique_visitors = EXCLUDED.unique_visitors
    RETURNING day
  `) as Array<{ day: string }>;
  return rows.length;
}

export async function rollupYesterdaysPings(): Promise<number> {
  const rows = (await sql`
    INSERT INTO analytics_dashboard_daily (day, total_pings, unique_visitors, unique_rooms_viewed, approx_view_seconds)
    SELECT
      (created_at AT TIME ZONE 'UTC')::date AS day,
      COUNT(*)::int AS total_pings,
      COUNT(DISTINCT visitor_hash)::int AS unique_visitors,
      COUNT(DISTINCT room_id)::int AS unique_rooms_viewed,
      (COUNT(*) * 60)::bigint AS approx_view_seconds
    FROM analytics_dashboard_pings
    WHERE created_at >= (CURRENT_DATE - interval '1 day')::timestamptz
      AND created_at <  CURRENT_DATE::timestamptz
    GROUP BY 1
    ON CONFLICT (day) DO UPDATE
      SET total_pings = EXCLUDED.total_pings,
          unique_visitors = EXCLUDED.unique_visitors,
          unique_rooms_viewed = EXCLUDED.unique_rooms_viewed,
          approx_view_seconds = EXCLUDED.approx_view_seconds
    RETURNING day
  `) as Array<{ day: string }>;
  return rows.length;
}

export async function pruneOldPageviews(): Promise<number> {
  const rows = (await sql`
    DELETE FROM analytics_pageviews
    WHERE created_at < NOW() - interval '90 days'
    RETURNING id
  `) as Array<{ id: number }>;
  return rows.length;
}

export async function pruneOldPings(): Promise<number> {
  const rows = (await sql`
    DELETE FROM analytics_dashboard_pings
    WHERE created_at < NOW() - interval '90 days'
    RETURNING id
  `) as Array<{ id: number }>;
  return rows.length;
}

// ---- Admin stats helpers ----
//
// All windows are "last N days from now" (rolling), not calendar windows.
// Aggregates pull from daily rollups when possible (kept forever) and from
// raw tables only for today (which hasn't been rolled up yet).

export interface TrafficStats {
  pageviewsToday: number;
  pageviews7d: number;
  pageviews30d: number;
  uniqueVisitors7d: number;
  uniqueVisitors30d: number;
  topPaths: Array<{ path: string; pageviews: number }>;
  topCountries: Array<{ country: string | null; pageviews: number }>;
  topReferrers: Array<{ referrer_host: string | null; pageviews: number }>;
  deviceSplit: Array<{ device_class: string; pageviews: number }>;
  utmCampaigns: Array<{ source: string | null; medium: string | null; campaign: string | null; pageviews: number }>;
}

export async function getTrafficStats(): Promise<TrafficStats> {
  // Today's numbers come from the raw table (not yet rolled up).
  const [todayRow] = (await sql`
    SELECT COUNT(*)::int AS c FROM analytics_pageviews
    WHERE created_at >= CURRENT_DATE::timestamptz
  `) as Array<{ c: number }>;

  // 7d / 30d come from the daily rollup (yesterday and back) plus today's raw.
  const [pv7Row] = (await sql`
    SELECT COALESCE(SUM(pageviews), 0)::int AS c
    FROM analytics_pageviews_daily
    WHERE day >= CURRENT_DATE - interval '7 days' AND day < CURRENT_DATE
  `) as Array<{ c: number }>;
  const [pv30Row] = (await sql`
    SELECT COALESCE(SUM(pageviews), 0)::int AS c
    FROM analytics_pageviews_daily
    WHERE day >= CURRENT_DATE - interval '30 days' AND day < CURRENT_DATE
  `) as Array<{ c: number }>;

  // For uniques over rolling windows we hit the raw table directly. Bounded by
  // the 90-day prune; the cap on per-query work is roughly 90 * dailyVisitors.
  const [uv7Row] = (await sql`
    SELECT COUNT(DISTINCT visitor_hash)::int AS c
    FROM analytics_pageviews
    WHERE created_at >= NOW() - interval '7 days'
  `) as Array<{ c: number }>;
  const [uv30Row] = (await sql`
    SELECT COUNT(DISTINCT visitor_hash)::int AS c
    FROM analytics_pageviews
    WHERE created_at >= NOW() - interval '30 days'
  `) as Array<{ c: number }>;

  const topPaths = (await sql`
    SELECT path, COUNT(*)::int AS pageviews
    FROM analytics_pageviews
    WHERE created_at >= NOW() - interval '30 days'
    GROUP BY path
    ORDER BY pageviews DESC
    LIMIT 10
  `) as Array<{ path: string; pageviews: number }>;

  const topCountries = (await sql`
    SELECT country, COUNT(*)::int AS pageviews
    FROM analytics_pageviews
    WHERE created_at >= NOW() - interval '30 days'
    GROUP BY country
    ORDER BY pageviews DESC
    LIMIT 10
  `) as Array<{ country: string | null; pageviews: number }>;

  const topReferrers = (await sql`
    SELECT referrer_host, COUNT(*)::int AS pageviews
    FROM analytics_pageviews
    WHERE created_at >= NOW() - interval '30 days' AND referrer_host IS NOT NULL
    GROUP BY referrer_host
    ORDER BY pageviews DESC
    LIMIT 10
  `) as Array<{ referrer_host: string | null; pageviews: number }>;

  const deviceSplit = (await sql`
    SELECT device_class, COUNT(*)::int AS pageviews
    FROM analytics_pageviews
    WHERE created_at >= NOW() - interval '30 days'
    GROUP BY device_class
    ORDER BY pageviews DESC
  `) as Array<{ device_class: string; pageviews: number }>;

  const utmCampaigns = (await sql`
    SELECT utm_source AS source, utm_medium AS medium, utm_campaign AS campaign,
      COUNT(*)::int AS pageviews
    FROM analytics_pageviews
    WHERE created_at >= NOW() - interval '30 days'
      AND (utm_source IS NOT NULL OR utm_medium IS NOT NULL OR utm_campaign IS NOT NULL)
    GROUP BY utm_source, utm_medium, utm_campaign
    ORDER BY pageviews DESC
    LIMIT 10
  `) as Array<{
    source: string | null;
    medium: string | null;
    campaign: string | null;
    pageviews: number;
  }>;

  return {
    pageviewsToday: todayRow?.c ?? 0,
    pageviews7d: (pv7Row?.c ?? 0) + (todayRow?.c ?? 0),
    pageviews30d: (pv30Row?.c ?? 0) + (todayRow?.c ?? 0),
    uniqueVisitors7d: uv7Row?.c ?? 0,
    uniqueVisitors30d: uv30Row?.c ?? 0,
    topPaths,
    topCountries,
    topReferrers,
    deviceSplit,
    utmCampaigns,
  };
}

export interface DashboardEngagementStats {
  concurrentLast5min: number;
  uniqueVisitors7d: number;
  avgDwellSecondsPerVisitor7d: number;
  topViewedRoomsCount: number; // count only — anonymized; spec calls for no slug exposure
}

export async function getDashboardEngagementStats(): Promise<DashboardEngagementStats> {
  const [concurrentRow] = (await sql`
    SELECT COUNT(DISTINCT visitor_hash)::int AS c
    FROM analytics_dashboard_pings
    WHERE created_at >= NOW() - interval '5 minutes'
  `) as Array<{ c: number }>;

  const [uv7Row] = (await sql`
    SELECT COUNT(DISTINCT visitor_hash)::int AS c
    FROM analytics_dashboard_pings
    WHERE created_at >= NOW() - interval '7 days'
  `) as Array<{ c: number }>;

  // Each ping = ~60s of attention. Average per visitor over the window.
  const [dwellRow] = (await sql`
    SELECT COALESCE(AVG(per_visitor_pings), 0) AS avg_pings
    FROM (
      SELECT visitor_hash, COUNT(*)::int AS per_visitor_pings
      FROM analytics_dashboard_pings
      WHERE created_at >= NOW() - interval '7 days'
      GROUP BY visitor_hash
    ) s
  `) as Array<{ avg_pings: string | number }>;
  const avgPings = Number(dwellRow?.avg_pings ?? 0);

  const [topRoomsRow] = (await sql`
    SELECT COUNT(DISTINCT room_id)::int AS c
    FROM analytics_dashboard_pings
    WHERE created_at >= NOW() - interval '7 days'
  `) as Array<{ c: number }>;

  return {
    concurrentLast5min: concurrentRow?.c ?? 0,
    uniqueVisitors7d: uv7Row?.c ?? 0,
    avgDwellSecondsPerVisitor7d: Math.round(avgPings * 60),
    topViewedRoomsCount: topRoomsRow?.c ?? 0,
  };
}

export interface ProductActivityStats {
  roomsCreatedToday: number;
  roomsCreated7d: number;
  roomsCreated30d: number;
  agentsAdded7d: number;
  mcpCallsByKind7d: Array<{ kind: string; calls: number }>;
  activeRoomsNow: number; // rooms with at least one event in the last 24h
}

export async function getProductActivityStats(): Promise<ProductActivityStats> {
  const [r0] = (await sql`
    SELECT COUNT(*)::int AS c FROM rooms WHERE created_at >= CURRENT_DATE::timestamptz
  `) as Array<{ c: number }>;
  const [r7] = (await sql`
    SELECT COUNT(*)::int AS c FROM rooms WHERE created_at >= NOW() - interval '7 days'
  `) as Array<{ c: number }>;
  const [r30] = (await sql`
    SELECT COUNT(*)::int AS c FROM rooms WHERE created_at >= NOW() - interval '30 days'
  `) as Array<{ c: number }>;

  const [a7] = (await sql`
    SELECT COUNT(*)::int AS c FROM agents WHERE created_at >= NOW() - interval '7 days'
  `) as Array<{ c: number }>;

  const mcpCalls = (await sql`
    SELECT kind, COUNT(*)::int AS calls
    FROM events
    WHERE created_at >= NOW() - interval '7 days'
    GROUP BY kind
    ORDER BY calls DESC
  `) as Array<{ kind: string; calls: number }>;

  const [active] = (await sql`
    SELECT COUNT(DISTINCT room_id)::int AS c
    FROM events
    WHERE created_at >= NOW() - interval '24 hours'
  `) as Array<{ c: number }>;

  return {
    roomsCreatedToday: r0?.c ?? 0,
    roomsCreated7d: r7?.c ?? 0,
    roomsCreated30d: r30?.c ?? 0,
    agentsAdded7d: a7?.c ?? 0,
    mcpCallsByKind7d: mcpCalls,
    activeRoomsNow: active?.c ?? 0,
  };
}

// Time-series for the admin dashboard charts. Pulls from the daily rollups so
// the query is bounded at ~30 rows regardless of underlying traffic — Neon
// compute is negligible. `days` capped at 90 to match the raw-row retention.
export interface DailyTrend {
  pageviews: Array<{ day: string; pageviews: number; unique_visitors: number }>;
  dwellSeconds: Array<{ day: string; approx_view_seconds: number; unique_visitors: number }>;
  roomsCreated: Array<{ day: string; rooms: number }>;
}

export async function getDailyTrend(days = 30): Promise<DailyTrend> {
  const cappedDays = Math.min(Math.max(days, 7), 90);

  // Pageviews: sum across path/country/device for each day.
  const pageviews = (await sql`
    SELECT day::text AS day,
      COALESCE(SUM(pageviews), 0)::int AS pageviews,
      COALESCE(SUM(unique_visitors), 0)::int AS unique_visitors
    FROM analytics_pageviews_daily
    WHERE day >= CURRENT_DATE - (${cappedDays} || ' days')::interval
    GROUP BY day
    ORDER BY day ASC
  `) as Array<{ day: string; pageviews: number; unique_visitors: number }>;

  const dwellSeconds = (await sql`
    SELECT day::text AS day, approx_view_seconds::bigint AS approx_view_seconds,
      unique_visitors
    FROM analytics_dashboard_daily
    WHERE day >= CURRENT_DATE - (${cappedDays} || ' days')::interval
    ORDER BY day ASC
  `) as Array<{ day: string; approx_view_seconds: number | string; unique_visitors: number }>;

  // Rooms created per day — derived from the existing rooms table; no rollup
  // needed since rooms are inherently low-volume.
  const roomsCreated = (await sql`
    SELECT (created_at AT TIME ZONE 'UTC')::date::text AS day,
      COUNT(*)::int AS rooms
    FROM rooms
    WHERE created_at >= NOW() - (${cappedDays} || ' days')::interval
    GROUP BY 1
    ORDER BY 1 ASC
  `) as Array<{ day: string; rooms: number }>;

  return {
    pageviews,
    dwellSeconds: dwellSeconds.map((r) => ({
      day: r.day,
      approx_view_seconds: Number(r.approx_view_seconds),
      unique_visitors: r.unique_visitors,
    })),
    roomsCreated,
  };
}

export interface SponsorClickStats {
  clicks7d: number;
  clicks30d: number;
  bySponsor30d: Array<{ sponsor_slug: string; clicks: number }>;
  bySourcePath30d: Array<{ source_path: string; clicks: number }>;
}

export async function getSponsorClickStats(): Promise<SponsorClickStats> {
  const [c7] = (await sql`
    SELECT COUNT(*)::int AS c FROM analytics_sponsor_clicks
    WHERE created_at >= NOW() - interval '7 days'
  `) as Array<{ c: number }>;
  const [c30] = (await sql`
    SELECT COUNT(*)::int AS c FROM analytics_sponsor_clicks
    WHERE created_at >= NOW() - interval '30 days'
  `) as Array<{ c: number }>;

  const bySponsor = (await sql`
    SELECT sponsor_slug, COUNT(*)::int AS clicks
    FROM analytics_sponsor_clicks
    WHERE created_at >= NOW() - interval '30 days'
    GROUP BY sponsor_slug
    ORDER BY clicks DESC
    LIMIT 10
  `) as Array<{ sponsor_slug: string; clicks: number }>;

  const bySource = (await sql`
    SELECT source_path, COUNT(*)::int AS clicks
    FROM analytics_sponsor_clicks
    WHERE created_at >= NOW() - interval '30 days'
    GROUP BY source_path
    ORDER BY clicks DESC
    LIMIT 10
  `) as Array<{ source_path: string; clicks: number }>;

  return {
    clicks7d: c7?.c ?? 0,
    clicks30d: c30?.c ?? 0,
    bySponsor30d: bySponsor,
    bySourcePath30d: bySource,
  };
}
