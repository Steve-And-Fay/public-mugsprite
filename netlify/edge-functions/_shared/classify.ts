// Shared classifiers used by both track-pageview and track-ping edge
// functions. Pure functions only — no I/O — so they're trivial to test.

export type DeviceClass = 'mobile' | 'desktop' | 'bot' | 'other';

// Bot detection is intentionally permissive: anything that looks like a
// crawler/scripted client gets dropped at ingest. We'd rather under-count
// real visits than over-count bots in sponsor-facing numbers.
const BOT_RE =
  /bot|crawler|spider|scrapy|curl|wget|headlesschrome|phantomjs|httpclient|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|googlebot|bingbot|duckduckbot|yandex|baidu|pingdom|uptimerobot|monitis|statuscake|gtmetrix|lighthouse|chrome-lighthouse/i;

const MOBILE_RE = /mobi|android|iphone|ipod|blackberry|iemobile|opera mini/i;

const BROWSER_RE = /mozilla|chrome|safari|firefox|edge|opera/i;

export function classifyDevice(ua: string | null | undefined): DeviceClass {
  if (!ua) return 'other';
  if (BOT_RE.test(ua)) return 'bot';
  if (MOBILE_RE.test(ua)) return 'mobile';
  if (BROWSER_RE.test(ua)) return 'desktop';
  return 'other';
}

// Normalize variable URL segments so /r/abc123 and /r/xyz789 aggregate as
// /r/:roomId in the analytics table. Strip query and fragment.
export function normalizePath(rawPath: string): string {
  let p = rawPath.split('?')[0]!.split('#')[0]!;
  if (!p.startsWith('/')) p = '/' + p;
  // /r/<slug>/tv → /r/:roomId/tv
  p = p.replace(/^\/r\/[^/]+(\/.*)?$/, (_match, rest) => `/r/:roomId${rest ?? ''}`);
  // Trim trailing slash except for root.
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  // Defensive length cap so a malicious caller can't blow up storage with
  // arbitrarily long paths.
  if (p.length > 200) p = p.slice(0, 200);
  return p;
}

// Extract bare host from a referrer URL. Empty string / invalid URL → null.
// We never store the path or query of a referrer to avoid leaking info from
// other sites people came from.
export function extractReferrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const u = new URL(referrer);
    return u.hostname || null;
  } catch {
    return null;
  }
}

// Resolve visitor country from headers Netlify and Cloudflare provide.
// `x-nf-geo` (Netlify Edge) is a JSON blob; `cf-ipcountry` is a bare code.
export function resolveCountry(headers: Headers): string | null {
  const cf = headers.get('cf-ipcountry');
  if (cf && cf !== 'XX' && cf.length === 2) return cf.toUpperCase();
  const nf = headers.get('x-nf-geo');
  if (nf) {
    try {
      const parsed = JSON.parse(nf) as { country?: { code?: string } };
      const code = parsed.country?.code;
      if (code && code.length === 2) return code.toUpperCase();
    } catch {
      /* fall through */
    }
  }
  return null;
}

export function clientIp(headers: Headers): string {
  return (
    headers.get('x-nf-client-connection-ip') ??
    headers.get('cf-connecting-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
