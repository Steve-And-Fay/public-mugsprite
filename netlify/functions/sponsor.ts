// Click-tracking redirect for the sponsor slot. Logs an aggregate impression
// to console (which Netlify captures) and 302s to the destination URL.
//
// Privacy: only the anonymized /24 prefix of IPv4 (or /48 of IPv6) is stored
// in the log. No cookies, no fingerprinting, no PII. The log line is intended
// for monthly aggregation into the sponsor report.

import { methodNotAllowed } from './_lib/http';

const ALLOWED_HOSTS = new Set([
  'internetcrafters.com',
  'www.internetcrafters.com',
  // Add sponsor hosts here when bookings happen.
]);

function anonymizeIp(ip: string | null): string {
  if (!ip) return 'unknown';
  if (ip.includes(':')) {
    // IPv6 → keep first 3 hextets (/48)
    return ip.split(':').slice(0, 3).join(':') + '::/48';
  }
  // IPv4 → keep first 3 octets (/24)
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  return 'unknown';
}

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/(?:\.netlify\/functions\/sponsor|sponsor)\/?/, '');

  if (path !== 'click') {
    return new Response('not found', { status: 404 });
  }
  if (req.method !== 'GET') return methodNotAllowed(['GET']);

  const target = url.searchParams.get('to');
  const ref = url.searchParams.get('ref') ?? 'unknown';

  if (!target) {
    return new Response('missing ?to', { status: 400 });
  }

  // Validate target URL — reject anything that isn't on the allowed sponsor
  // host list. Prevents the endpoint becoming an open redirect.
  let dest: URL;
  try {
    dest = new URL(target);
  } catch {
    return new Response('invalid target url', { status: 400 });
  }
  if (dest.protocol !== 'https:' && dest.protocol !== 'http:') {
    return new Response('disallowed protocol', { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(dest.hostname)) {
    return new Response(`host not in sponsor allow-list: ${dest.hostname}`, { status: 400 });
  }

  // Netlify exposes the client IP via x-nf-client-connection-ip.
  const ip =
    req.headers.get('x-nf-client-connection-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null;

  console.log(
    JSON.stringify({
      kind: 'sponsor_click',
      sponsor_host: dest.hostname,
      referrer_page: ref,
      anonymized_ip: anonymizeIp(ip),
      at: new Date().toISOString(),
    }),
  );

  return Response.redirect(dest.toString(), 302);
};
