import { useEffect, useRef, useState } from 'react';

// Cast the TV view to a Chromecast/Presentation-API-compatible display.
//
// Browser support is uneven:
//  - Chrome / Edge desktop + Android: full Presentation API → one-click cast.
//  - Safari / Firefox: no API. Falls back to a button that opens the TV URL
//    in a new tab; the user can then screen-mirror / AirPlay that tab.
//
// We only render the in-app button when there is a presentation-capable
// device available on the network. If the API doesn't exist OR no devices
// are around, we render the fallback link so users can still get to the TV
// view via tab-mirror / AirPlay.

interface CastButtonProps {
  roomId: string;
  className?: string;
}

type PresentationLike = {
  start: () => Promise<unknown>;
  getAvailability: () => Promise<{
    value: boolean;
    addEventListener: (event: 'change', cb: () => void) => void;
    removeEventListener: (event: 'change', cb: () => void) => void;
  }>;
};

export function CastButton({ roomId, className }: CastButtonProps) {
  const [available, setAvailable] = useState(false);
  const requestRef = useRef<PresentationLike | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const Ctor = (window as unknown as { PresentationRequest?: new (urls: string[]) => PresentationLike })
      .PresentationRequest;
    if (!Ctor) return;
    const tvUrl = `${window.location.origin}/r/${roomId}/tv`;
    let cancelled = false;
    let availability: Awaited<ReturnType<PresentationLike['getAvailability']>> | null = null;
    let onChange: (() => void) | null = null;
    try {
      const request = new Ctor([tvUrl]);
      requestRef.current = request;
      request
        .getAvailability()
        .then((a) => {
          if (cancelled) return;
          availability = a;
          setAvailable(a.value);
          onChange = () => setAvailable(a.value);
          a.addEventListener('change', onChange);
        })
        .catch(() => {
          /* Some browsers reject getAvailability on insecure origins or when
             casting is fully unavailable — silently fall through to the
             fallback link UI. */
        });
    } catch {
      /* PresentationRequest threw — fall back below. */
    }
    return () => {
      cancelled = true;
      if (availability && onChange) {
        availability.removeEventListener('change', onChange);
      }
      requestRef.current = null;
    };
  }, [roomId]);

  const handleCast = () => {
    const req = requestRef.current;
    if (!req) return;
    req.start().catch(() => {
      // User cancelled the device picker, or selection failed. Nothing to
      // do — leave them on the room page.
    });
  };

  const tvHref = `/r/${roomId}/tv`;
  const cls =
    className ??
    'inline-flex items-center gap-2 font-display text-[10px] tracking-widest border-2 border-paper/40 rounded px-2.5 py-1.5 hover:border-paper';

  if (requestRef.current && available) {
    return (
      <button type="button" onClick={handleCast} className={cls} aria-label="Cast room to TV">
        <span aria-hidden="true">📺</span> CAST TO TV
      </button>
    );
  }

  // Fallback: open the TV view in a new tab so the user can mirror /
  // AirPlay it themselves. Also covers the case where there are no
  // Presentation-capable devices on the network.
  return (
    <a
      href={tvHref}
      target="_blank"
      rel="noopener noreferrer"
      className={cls}
      aria-label="Open TV view in new tab"
    >
      <span aria-hidden="true">📺</span> OPEN TV VIEW
    </a>
  );
}
