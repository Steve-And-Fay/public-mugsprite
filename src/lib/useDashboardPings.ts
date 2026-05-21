import { useEffect } from 'react';

// Heartbeat ping fired every 60s while the dashboard tab is visible. Each row
// in analytics_dashboard_pings = ~60s of attention on this room. Stops while
// the tab is hidden so background tabs don't inflate dwell time.
//
// Skipped when the URL has ?owner= so the room operator's own viewing doesn't
// pollute the engagement numbers they'll quote to sponsors.

const INTERVAL_MS = 60_000;

function postPing(roomId: string): void {
  const payload = JSON.stringify({ roomId });
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      const ok = navigator.sendBeacon('/api/track/ping', blob);
      if (ok) return;
    }
  } catch {
    // fall through
  }
  void fetch('/api/track/ping', {
    method: 'POST',
    body: payload,
    headers: { 'content-type': 'application/json' },
    keepalive: true,
  }).catch(() => {
    /* swallow */
  });
}

export function useDashboardPings(roomId: string | undefined, isOwner: boolean): void {
  useEffect(() => {
    if (!roomId || isOwner) return;
    if (typeof document === 'undefined') return;

    let timer: number | undefined;

    const fire = () => {
      if (document.visibilityState !== 'visible') return;
      postPing(roomId);
    };

    // Fire once on mount so even brief visits count.
    fire();
    timer = window.setInterval(fire, INTERVAL_MS);

    const onVisibility = () => {
      // When the tab returns to visible, fire immediately so the next 60s
      // window starts on a real ping rather than waiting for the timer.
      if (document.visibilityState === 'visible') fire();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (timer !== undefined) window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [roomId, isOwner]);
}
