import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Fires a pageview on every route change. Uses sendBeacon when available so
// the request survives page unloads (and avoids holding the navigation
// transaction open). Failures are swallowed — analytics must never break the
// page.
//
// Skipped when the URL includes ?owner= because the operator looking at their
// own admin/owner views shouldn't pollute their own traffic numbers.

interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
}

function extractUtm(search: string): UtmParams | undefined {
  const params = new URLSearchParams(search);
  const source = params.get('utm_source') ?? undefined;
  const medium = params.get('utm_medium') ?? undefined;
  const campaign = params.get('utm_campaign') ?? undefined;
  if (!source && !medium && !campaign) return undefined;
  return { source, medium, campaign };
}

function postPageview(body: Record<string, unknown>): void {
  const payload = JSON.stringify(body);
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      const ok = navigator.sendBeacon('/api/track/pageview', blob);
      if (ok) return;
    }
  } catch {
    // fall through to fetch
  }
  // sendBeacon unavailable or refused → fetch with keepalive.
  void fetch('/api/track/pageview', {
    method: 'POST',
    body: payload,
    headers: { 'content-type': 'application/json' },
    keepalive: true,
  }).catch(() => {
    /* swallow */
  });
}

export function useAnalytics(): void {
  const location = useLocation();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    const search = location.search;
    // Operator viewing their own room or admin: skip to avoid self-polluting.
    if (search.includes('owner=') || location.pathname.startsWith('/admin')) {
      return;
    }
    const key = location.pathname + search;
    if (lastTracked.current === key) return;
    lastTracked.current = key;

    postPageview({
      path: location.pathname,
      referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      utm: extractUtm(search),
    });
  }, [location.pathname, location.search]);
}
