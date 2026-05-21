import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUserMenu } from '../lib/useUserMenu';
import type { UserMenuItem } from '../components/UserMenuContext';

// Owner-only analytics dashboard. Lives at /admin?token=<ADMIN_TOKEN>.
// All data comes from a single /api/admin/stats call. Charts are intentionally
// simple HTML — this page is for the operator, not visitors.

interface TopRow {
  label: string;
  count: number;
}

interface TrafficSection {
  pageviewsToday?: number;
  pageviews7d?: number;
  pageviews30d?: number;
  uniqueVisitors7d?: number;
  uniqueVisitors30d?: number;
  topPaths?: Array<{ path: string; pageviews: number }>;
  topCountries?: Array<{ country: string | null; pageviews: number }>;
  topReferrers?: Array<{ referrer_host: string | null; pageviews: number }>;
  deviceSplit?: Array<{ device_class: string; pageviews: number }>;
  utmCampaigns?: Array<{
    source: string | null;
    medium: string | null;
    campaign: string | null;
    pageviews: number;
  }>;
  error?: string;
}

interface EngagementSection {
  concurrentLast5min?: number;
  uniqueVisitors7d?: number;
  avgDwellSecondsPerVisitor7d?: number;
  topViewedRoomsCount?: number;
  error?: string;
}

interface ProductSection {
  roomsCreatedToday?: number;
  roomsCreated7d?: number;
  roomsCreated30d?: number;
  agentsAdded7d?: number;
  mcpCallsByKind7d?: Array<{ kind: string; calls: number }>;
  activeRoomsNow?: number;
  error?: string;
}

interface SponsorSection {
  clicks7d?: number;
  clicks30d?: number;
  bySponsor30d?: Array<{ sponsor_slug: string; clicks: number }>;
  bySourcePath30d?: Array<{ source_path: string; clicks: number }>;
  error?: string;
}

interface TrendSection {
  pageviews?: Array<{ day: string; pageviews: number; unique_visitors: number }>;
  dwellSeconds?: Array<{ day: string; approx_view_seconds: number; unique_visitors: number }>;
  roomsCreated?: Array<{ day: string; rooms: number }>;
  error?: string;
}

interface StatsResponse {
  generatedAt: string;
  traffic: TrafficSection;
  engagement: EngagementSection;
  product: ProductSection;
  sponsor: SponsorSection;
  trend: TrendSection;
}

export default function AdminPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Admin hamburger menu — registered via context so it appears in the top
  // chrome alongside the BETA banner. Items are admin-specific actions; the
  // same pattern will eventually carry room-owner actions on RoomPage.
  const menuItems = useMemo<UserMenuItem[]>(
    () => [
      { label: 'REFRESH', onClick: () => setRefreshNonce((n) => n + 1) },
      { label: 'TRIGGER CLEANUP NOW', href: '/__cleanup', external: true },
      { label: 'OPEN MUGSPRITE.COM', href: '/', external: false },
      {
        label: 'SIGN OUT',
        variant: 'danger',
        onClick: () => {
          // Strip the token from the URL and reload so the admin guard
          // (missing ?token) bounces the user back to the empty state.
          window.location.assign('/admin');
        },
      },
    ],
    [],
  );
  useUserMenu(menuItems);

  useEffect(() => {
    if (!token) {
      setError('Missing ?token= query param.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/stats?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = (await res.json()) as StatsResponse | { error: string; message?: string };
        if (cancelled) return;
        if (!res.ok) {
          const msg =
            'message' in body
              ? body.message ?? body.error
              : `HTTP ${res.status}`;
          setError(String(msg));
        } else {
          setStats(body as StatsResponse);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, refreshNonce]);

  // Refresh-on-focus: when the operator returns to the admin tab, fetch fresh
  // numbers. No setInterval, no polling — the page is idle whenever it's not
  // in front of you. Cheap and matches how operators actually use a dashboard.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setRefreshNonce((n) => n + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <div className="flex-1 max-w-[1600px] mx-auto w-full p-6 lg:p-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl tracking-widest">MUGSPRITE / ADMIN</h1>
        {stats && (
          <p className="text-xs opacity-60">
            Generated {new Date(stats.generatedAt).toLocaleString()}
          </p>
        )}
      </header>

      {loading && <p className="opacity-60">Loading…</p>}
      {error && (
        <div className="border-[3px] border-ink rounded-xl bg-accent-yellow p-6 max-w-xl">
          <p className="font-display tracking-widest text-sm mb-2">ERROR</p>
          <p>{error}</p>
        </div>
      )}

      {stats && (
        <div className="grid gap-8 lg:grid-cols-2">
          <TrafficCard data={stats.traffic} trend={stats.trend} />
          <EngagementCard data={stats.engagement} trend={stats.trend} />
          <ProductCard data={stats.product} trend={stats.trend} />
          <SponsorCard data={stats.sponsor} />
        </div>
      )}
    </div>
  );
}

// Pure-SVG bar chart for daily trends. Cheap to render (no chart lib, no
// runtime cost beyond the rows themselves). Renders nothing if there are no
// non-zero rows so a fresh deploy with empty rollups doesn't show ghost axes.
function BarChart({
  data,
  height = 80,
  label,
}: {
  data: Array<{ day: string; value: number }>;
  height?: number;
  label?: string;
}) {
  if (!data || data.length === 0) {
    return <p className="text-xs opacity-60">No daily data yet — rolls up nightly.</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 100 / data.length;
  return (
    <div>
      {label && (
        <div className="flex justify-between items-baseline mb-1 text-[10px] opacity-60 uppercase tracking-wider">
          <span>{label}</span>
          <span>peak {max.toLocaleString()}</span>
        </div>
      )}
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 2);
          return (
            <rect
              key={d.day}
              x={i * barWidth + barWidth * 0.1}
              y={height - h}
              width={barWidth * 0.8}
              height={Math.max(h, d.value > 0 ? 1 : 0)}
              fill="currentColor"
            >
              <title>{`${d.day}: ${d.value.toLocaleString()}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] opacity-60 mt-1">
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </div>
  );
}

function CardShell({ title, error, children }: { title: string; error?: string; children: React.ReactNode }) {
  return (
    <section className="border-[3px] border-ink rounded-xl bg-paper p-5 shadow-brutal">
      <h2 className="font-display tracking-widest text-lg mb-4">{title}</h2>
      {error ? (
        <p className="text-sm text-red-700">Section failed: {error}</p>
      ) : (
        children
      )}
    </section>
  );
}

function BigStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-xs opacity-60 uppercase tracking-wider">{label}</div>
      <div className="font-display text-2xl">{value}</div>
    </div>
  );
}

function TopList({ rows }: { rows: TopRow[] }) {
  if (rows.length === 0) return <p className="text-sm opacity-60">No data yet.</p>;
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex justify-between gap-2">
            <span className="truncate">{r.label}</span>
            <span className="tabular-nums opacity-70">{r.count.toLocaleString()}</span>
          </div>
          <div className="h-1 bg-ink/10 rounded overflow-hidden">
            <div
              className="h-full bg-ink"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TrafficCard({ data, trend }: { data: TrafficSection; trend: TrendSection }) {
  const pvBars = (trend.pageviews ?? []).map((d) => ({ day: d.day, value: d.pageviews }));
  const uvBars = (trend.pageviews ?? []).map((d) => ({ day: d.day, value: d.unique_visitors }));
  return (
    <CardShell title="TRAFFIC" error={data.error}>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <BigStat label="Today" value={data.pageviewsToday ?? 0} />
        <BigStat label="7d pageviews" value={data.pageviews7d ?? 0} />
        <BigStat label="30d pageviews" value={data.pageviews30d ?? 0} />
        <BigStat label="7d uniques" value={data.uniqueVisitors7d ?? 0} />
        <BigStat label="30d uniques" value={data.uniqueVisitors30d ?? 0} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <BarChart data={pvBars} label="PAGEVIEWS / DAY (30d)" />
        <BarChart data={uvBars} label="UNIQUE VISITORS / DAY (30d)" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-display text-xs tracking-widest mb-2 opacity-70">TOP PAGES (30d)</h3>
          <TopList rows={(data.topPaths ?? []).map((r) => ({ label: r.path, count: r.pageviews }))} />
        </div>
        <div>
          <h3 className="font-display text-xs tracking-widest mb-2 opacity-70">COUNTRIES (30d)</h3>
          <TopList
            rows={(data.topCountries ?? []).map((r) => ({
              label: r.country ?? '(unknown)',
              count: r.pageviews,
            }))}
          />
        </div>
        <div>
          <h3 className="font-display text-xs tracking-widest mb-2 opacity-70">REFERRERS (30d)</h3>
          <TopList
            rows={(data.topReferrers ?? []).map((r) => ({
              label: r.referrer_host ?? '(direct)',
              count: r.pageviews,
            }))}
          />
        </div>
        <div>
          <h3 className="font-display text-xs tracking-widest mb-2 opacity-70">DEVICE (30d)</h3>
          <TopList
            rows={(data.deviceSplit ?? []).map((r) => ({
              label: r.device_class,
              count: r.pageviews,
            }))}
          />
        </div>
      </div>
      {data.utmCampaigns && data.utmCampaigns.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-xs tracking-widest mb-2 opacity-70">UTM (30d)</h3>
          <TopList
            rows={data.utmCampaigns.map((r) => ({
              label: [r.source, r.medium, r.campaign].filter(Boolean).join(' / ') || '(none)',
              count: r.pageviews,
            }))}
          />
        </div>
      )}
    </CardShell>
  );
}

function EngagementCard({ data, trend }: { data: EngagementSection; trend: TrendSection }) {
  const dwellBars = (trend.dwellSeconds ?? []).map((d) => ({
    day: d.day,
    value: Math.round(d.approx_view_seconds / 60),
  }));
  const dwellMin =
    data.avgDwellSecondsPerVisitor7d !== undefined
      ? (data.avgDwellSecondsPerVisitor7d / 60).toFixed(1) + ' min'
      : '0 min';
  return (
    <CardShell title="DASHBOARD ENGAGEMENT" error={data.error}>
      <div className="grid grid-cols-2 gap-4 mb-2">
        <BigStat label="Concurrent (5m)" value={data.concurrentLast5min ?? 0} />
        <BigStat label="7d viewers" value={data.uniqueVisitors7d ?? 0} />
        <BigStat label="Avg dwell / visitor (7d)" value={dwellMin} />
        <BigStat label="Rooms viewed (7d)" value={data.topViewedRoomsCount ?? 0} />
      </div>
      <div className="mt-4">
        <BarChart data={dwellBars} label="TOTAL DASHBOARD MINUTES / DAY (30d)" />
      </div>
      <p className="text-xs opacity-60 mt-4">
        Each ping ≈ 60s of visible attention. Owner-side views are excluded.
      </p>
    </CardShell>
  );
}

function ProductCard({ data, trend }: { data: ProductSection; trend: TrendSection }) {
  const roomBars = (trend.roomsCreated ?? []).map((d) => ({ day: d.day, value: d.rooms }));
  return (
    <CardShell title="PRODUCT ACTIVITY" error={data.error}>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <BigStat label="Rooms today" value={data.roomsCreatedToday ?? 0} />
        <BigStat label="Rooms 7d" value={data.roomsCreated7d ?? 0} />
        <BigStat label="Rooms 30d" value={data.roomsCreated30d ?? 0} />
        <BigStat label="Agents 7d" value={data.agentsAdded7d ?? 0} />
        <BigStat label="Active rooms (24h)" value={data.activeRoomsNow ?? 0} />
      </div>
      <div className="mb-6">
        <BarChart data={roomBars} label="ROOMS CREATED / DAY (30d)" />
      </div>
      <h3 className="font-display text-xs tracking-widest mb-2 opacity-70">MCP CALLS BY KIND (7d)</h3>
      <TopList
        rows={(data.mcpCallsByKind7d ?? []).map((r) => ({ label: r.kind, count: r.calls }))}
      />
    </CardShell>
  );
}

function SponsorCard({ data }: { data: SponsorSection }) {
  return (
    <CardShell title="SPONSOR CLICKS" error={data.error}>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <BigStat label="Clicks 7d" value={data.clicks7d ?? 0} />
        <BigStat label="Clicks 30d" value={data.clicks30d ?? 0} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-display text-xs tracking-widest mb-2 opacity-70">BY SPONSOR (30d)</h3>
          <TopList
            rows={(data.bySponsor30d ?? []).map((r) => ({
              label: r.sponsor_slug,
              count: r.clicks,
            }))}
          />
        </div>
        <div>
          <h3 className="font-display text-xs tracking-widest mb-2 opacity-70">BY SOURCE PATH (30d)</h3>
          <TopList
            rows={(data.bySourcePath30d ?? []).map((r) => ({
              label: r.source_path,
              count: r.clicks,
            }))}
          />
        </div>
      </div>
    </CardShell>
  );
}
