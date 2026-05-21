import {
  getDailyTrend,
  getDashboardEngagementStats,
  getProductActivityStats,
  getSponsorClickStats,
  getTrafficStats,
} from './_lib/analyticsDb';
import { json, methodNotAllowed, parseBearer, tokensMatch, unauthorized } from './_lib/http';

// Owner-only analytics endpoint. Gated by a single env var ADMIN_TOKEN.
// Accepts the token via Authorization: Bearer <token> OR ?token=<token>
// query param (so the dashboard page can pass it without a custom fetch).
//
// Each section runs independently — a failure in one query returns an error
// object for that section rather than 500ing the whole response, so the
// dashboard still renders the other sections.

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/(?:\.netlify\/functions\/admin|api\/admin)\/?/, '');

  if (path !== 'stats' && path !== 'stats/') {
    return new Response('not found', { status: 404 });
  }
  if (req.method !== 'GET') return methodNotAllowed(['GET']);

  const expected = process.env.ADMIN_TOKEN ?? '';
  if (!expected) {
    return new Response(
      JSON.stringify({ error: 'admin_disabled', message: 'ADMIN_TOKEN env var not set' }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }
  const presented = parseBearer(req) ?? url.searchParams.get('token') ?? '';
  if (!presented || !tokensMatch(expected, presented)) {
    return unauthorized('invalid admin token');
  }

  // Run all section queries in parallel. Promise.allSettled so one failed
  // section doesn't block the others.
  const [traffic, engagement, product, sponsor, trend] = await Promise.allSettled([
    getTrafficStats(),
    getDashboardEngagementStats(),
    getProductActivityStats(),
    getSponsorClickStats(),
    getDailyTrend(30),
  ]);

  const sectionOrError = <T,>(s: PromiseSettledResult<T>) =>
    s.status === 'fulfilled' ? s.value : { error: 'query_failed', message: String(s.reason) };

  return json(200, {
    generatedAt: new Date().toISOString(),
    traffic: sectionOrError(traffic),
    engagement: sectionOrError(engagement),
    product: sectionOrError(product),
    sponsor: sectionOrError(sponsor),
    trend: sectionOrError(trend),
  });
};
