import { neon } from 'https://esm.sh/@netlify/neon@0.1.0';
import type { Config } from 'https://edge.netlify.com/';
import { classifyDevice, clientIp, extractReferrerHost, normalizePath, resolveCountry } from './_shared/classify.ts';
import { getTodaysSalt, hashVisitor } from './_shared/salt.ts';

// POST /api/track/pageview
// Body: { path: string, referrer?: string, utm?: {source?, medium?, campaign?} }
//
// Always returns 204. Errors are logged but never propagated to the client —
// analytics failures must not break the page. Bot UAs are dropped at ingest.

interface Body {
  path?: unknown;
  referrer?: unknown;
  utm?: { source?: unknown; medium?: unknown; campaign?: unknown } | null;
}

function trimOrNull(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  try {
    const body = (await req.json()) as Body;
    if (typeof body.path !== 'string') {
      return new Response(null, { status: 204 });
    }

    const ua = req.headers.get('user-agent') ?? '';
    const device = classifyDevice(ua);
    if (device === 'bot') {
      // Drop bots silently. Don't store, don't bill.
      return new Response(null, { status: 204 });
    }

    const path = normalizePath(body.path);
    const referrerHost = extractReferrerHost(
      typeof body.referrer === 'string' ? body.referrer : null,
    );
    const country = resolveCountry(req.headers);
    const utm = body.utm ?? null;
    const utmSource = utm ? trimOrNull(utm.source, 64) : null;
    const utmMedium = utm ? trimOrNull(utm.medium, 64) : null;
    const utmCampaign = utm ? trimOrNull(utm.campaign, 64) : null;

    const salt = await getTodaysSalt();
    const ip = clientIp(req.headers);
    const visitorHash = await hashVisitor(salt, ip, ua);

    const sql = neon();
    await sql`
      INSERT INTO analytics_pageviews
        (visitor_hash, path, referrer_host, country, device_class, utm_source, utm_medium, utm_campaign)
      VALUES
        (${visitorHash}, ${path}, ${referrerHost}, ${country}, ${device},
         ${utmSource}, ${utmMedium}, ${utmCampaign})
    `;
  } catch (err) {
    console.error('track-pageview error', err);
    // Fall through to 204 — never break the page.
  }
  return new Response(null, { status: 204 });
};

export const config: Config = { path: '/api/track/pageview' };
