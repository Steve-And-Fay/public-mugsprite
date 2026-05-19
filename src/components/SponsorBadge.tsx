import { SLOTS, getSlotSponsor, isPaidSlot, sponsorPageLink, trackedSponsorUrl } from '../lib/sponsor';
import type { SlotId } from '../lib/sponsor';

interface SponsorBadgeProps {
  slot: SlotId;
}

// Fire-and-forget click tracking. The visible <a> uses the sponsor's direct
// URL with rel="noopener noreferrer" (no `nofollow` / no `sponsored`) so the
// link passes SEO equity — a stated sponsor benefit. We ping the tracking
// endpoint via Beacon (or a non-blocking fetch fallback) so the count is
// recorded without inserting a 302 redirect in the SEO path.
function pingClick(slot: SlotId, target: string) {
  const url = trackedSponsorUrl(target, slot);
  try {
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      navigator.sendBeacon(url);
      return;
    }
    void fetch(url, { method: 'GET', keepalive: true, mode: 'no-cors' });
  } catch {
    /* tracking is best-effort */
  }
}

export function SponsorBadge({ slot }: SponsorBadgeProps) {
  const config = SLOTS[slot];
  const sponsor = getSlotSponsor(slot);
  const paid = isPaidSlot(slot);
  const sponsorLink = sponsorPageLink(slot);
  const handleClick = () => pingClick(slot, sponsor.clickUrl);

  if (config.variant === 'hero') {
    return (
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="font-display text-[10px] tracking-widest opacity-60">
            {paid ? '★ SPONSORED THIS MONTH BY ★' : '★ POWERED IN PART BY ★'}
          </span>
        </div>
        <a
          href={sponsor.clickUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="block bg-paper border-[3px] border-ink rounded-2xl p-4 sm:p-5 shadow-brutal hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition"
        >
          <div className="flex items-center gap-4">
            <SponsorLogo sponsor={sponsor} className="h-12 sm:h-14 shrink-0" />
            <div className="text-left min-w-0 flex-1">
              <div className="font-display text-base sm:text-lg tracking-wider truncate">
                {sponsor.name}
              </div>
              <div className="text-sm opacity-70 leading-snug">{sponsor.tagline}</div>
            </div>
            <span aria-hidden="true" className="font-display text-lg opacity-40 shrink-0">→</span>
          </div>
        </a>
        <div className="mt-3 text-center">
          <a
            href={sponsorLink}
            className="inline-block font-display text-[10px] tracking-widest underline opacity-60 hover:opacity-100 transition"
          >
            SPONSOR THIS SLOT (${config.price}/MO) →
          </a>
        </div>
      </div>
    );
  }

  // footer variant: compact inline, sits in Layout footer or other tight rows.
  return (
    <span className="inline-flex items-center gap-2">
      <a
        href={sponsor.clickUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 hover:underline"
        aria-label={`Visit ${sponsor.name}`}
      >
        <SponsorLogo sponsor={sponsor} className="h-3.5" />
        <span>{sponsor.name}</span>
      </a>
      <a
        href={sponsorLink}
        className="font-display text-[9px] tracking-widest opacity-50 hover:opacity-100 underline"
        aria-label={`Sponsor the ${config.label} slot for $${config.price} per month`}
      >
        (${config.price}/MO)
      </a>
    </span>
  );
}

function SponsorLogo({
  sponsor,
  className,
}: {
  sponsor: { logoUrl?: string; name: string };
  className?: string;
}) {
  if (sponsor.logoUrl) {
    return <img src={sponsor.logoUrl} alt={sponsor.name} className={className} />;
  }
  const initials = sponsor.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center aspect-square bg-ink text-paper font-display tracking-widest rounded-lg ${className ?? ''}`}
    >
      <span className="px-1 text-[0.5em] sm:text-[0.55em] leading-none">{initials}</span>
    </span>
  );
}
