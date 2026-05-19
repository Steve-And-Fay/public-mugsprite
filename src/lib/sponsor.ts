// Sponsor slot configuration. Each placement is its own sellable slot with its
// own price and own activeSponsor. When activeSponsor is null, the slot falls
// back to FALLBACK so the slot is never empty (an empty slot signals a dead
// product). Swap activeSponsor when a sponsor books that specific slot.

export interface Sponsor {
  name: string;
  logoUrl?: string; // optional — text-only fallback if missing
  tagline: string;
  clickUrl: string;
  month?: string; // ISO YYYY-MM, only on active sponsors
}

export type SlotId = 'home_hero' | 'room_footer' | 'empty_state' | 'expired_card';
export type SlotVariant = 'hero' | 'footer';

export interface SlotConfig {
  id: SlotId;
  variant: SlotVariant;
  label: string; // human label, e.g. "Homepage Hero"
  shortLabel: string; // tracking-widest version, e.g. "HOMEPAGE HERO"
  description: string;
  audience: string;
  price: number; // monthly USD
  activeSponsor: Sponsor | null;
}

export const FALLBACK: Sponsor = {
  name: 'Internet Crafters',
  tagline: "$550 websites that don't look $550",
  clickUrl: 'https://internetcrafters.com?utm_source=mugsprite',
};

export const SLOTS: Record<SlotId, SlotConfig> = {
  home_hero: {
    id: 'home_hero',
    variant: 'hero',
    label: 'Homepage Hero',
    shortLabel: 'HOMEPAGE HERO',
    description:
      'Bordered sponsor card on the landing page, directly below the primary CTA. Largest type, biggest impressions — every visitor who lands on the site sees this slot before they create a room.',
    audience: 'Every site visitor. Highest top-of-funnel reach.',
    price: 300,
    activeSponsor: null,
  },
  room_footer: {
    id: 'room_footer',
    variant: 'footer',
    label: 'Active Room Footer',
    shortLabel: 'ROOM FOOTER',
    description:
      'Small persistent footer line on every active room ("Powered by Mugsprite · Sponsored by [you]"). High engagement — the dev keeps the tab open while their agents work.',
    audience: 'Engaged developers running agents. Long dwell time.',
    price: 200,
    activeSponsor: null,
  },
  empty_state: {
    id: 'empty_state',
    variant: 'hero',
    label: 'Empty-Room Hold',
    shortLabel: 'EMPTY-ROOM HOLD',
    description:
      'Renders inside a freshly created room while the owner is still wiring up agents — exactly when their attention is on the dashboard and they have nothing else to look at.',
    audience: 'New users mid-setup. Focused, dwelling.',
    price: 100,
    activeSponsor: null,
  },
  expired_card: {
    id: 'expired_card',
    variant: 'hero',
    label: 'End-of-Session Card',
    shortLabel: 'END-OF-SESSION CARD',
    description:
      'The "this room has expired" card every guest hits when their 7-day room ends. Natural decision moment — start a new room, or consider sponsoring.',
    audience: 'Returning users at a natural conversion moment.',
    price: 150,
    activeSponsor: null,
  },
};

export function getSlotSponsor(slot: SlotId): Sponsor {
  return SLOTS[slot].activeSponsor ?? FALLBACK;
}

export function isPaidSlot(slot: SlotId): boolean {
  return SLOTS[slot].activeSponsor !== null;
}

export function slotAnchor(slot: SlotId): string {
  return `slot-${slot.replace(/_/g, '-')}`;
}

export function sponsorPageLink(slot: SlotId): string {
  return `/sponsor#${slotAnchor(slot)}`;
}

// Wraps the destination URL in our click-tracking endpoint so we can count
// clicks before the redirect. The endpoint logs and 302s.
export function trackedSponsorUrl(target: string, referrer: string): string {
  const params = new URLSearchParams({ to: target, ref: referrer });
  return `/sponsor/click?${params.toString()}`;
}

export const ALL_SLOTS: SlotConfig[] = Object.values(SLOTS);
