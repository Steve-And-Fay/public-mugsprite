import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ObfuscatedEmail } from '../components/ObfuscatedEmail';
import { SponsorBadge } from '../components/SponsorBadge';
import { ALL_SLOTS, getSlotSponsor, isPaidSlot, slotAnchor } from '../lib/sponsor';
import type { SlotConfig } from '../lib/sponsor';

const SEO_TITLE = 'Sponsor Mugsprite — four slots, one budget';
const SEO_DESC =
  'Four sponsor slots fund Mugsprite hosting. Pick one or bundle for 25% off. Reach AI agent builders and creative tinkerers.';

export default function SponsorPage() {
  const totalBundle = ALL_SLOTS.reduce((sum, s) => sum + s.price, 0);
  const bundleDiscount = Math.round(totalBundle * 0.25);
  const bundlePrice = totalBundle - bundleDiscount;
  const canonical =
    typeof window !== 'undefined'
      ? window.location.origin + '/sponsor'
      : 'https://mugsprite.com/sponsor';
  const ogImage =
    typeof window !== 'undefined'
      ? window.location.origin + '/og.svg'
      : 'https://mugsprite.com/og.svg';

  return (
    <>
      <Helmet>
        <title>{SEO_TITLE}</title>
        <meta name="description" content={SEO_DESC} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={SEO_TITLE} />
        <meta property="og:description" content={SEO_DESC} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SEO_TITLE} />
        <meta name="twitter:description" content={SEO_DESC} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
    <main className="flex-1 p-6">
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="flex items-center justify-between">
          <Link to="/" className="font-display text-[10px] tracking-widest hover:underline">
            ← BACK
          </Link>
          <span className="font-display text-[10px] tracking-widest opacity-60">SPONSOR SLOTS</span>
        </header>

        <section className="space-y-3">
          <h1 className="font-display text-3xl md:text-4xl tracking-wider">
            FOUR SLOTS. PICK ONE OR BUNDLE.
          </h1>
          <p className="text-base leading-relaxed opacity-80">
            Mugsprite is a free dashboard where AI agents project animated faces while they work.
            It runs on a one-person hosting budget. Four sponsor slots cover the bill — each one
            is sellable separately, each priced for the audience it actually reaches.
          </p>
        </section>

        <Section heading="WHO'S WATCHING">
          <p>
            People building AI agents — MCP server authors, indie hackers running long workflows,
            agent-framework developers, anyone who wants their bot to feel less like a black box.
            Niche audience, qualified leads.
          </p>
        </Section>

        <Section heading="THE FOUR SLOTS">
          <p className="mb-4">
            Each slot sells for a different price because each one reaches a different audience.
            Click any "currently sponsored by" badge below to preview what the slot looks like in
            place.
          </p>
          <div className="space-y-4">
            {ALL_SLOTS.map((slot) => (
              <SlotCard key={slot.id} slot={slot} />
            ))}
          </div>
        </Section>

        <Section heading="BUNDLE ALL FOUR">
          <p>
            Take every slot for a month: <strong>${bundlePrice}/mo</strong> (full rate is $
            {totalBundle}; bundle saves ${bundleDiscount}). Your logo on the homepage hero, in
            the room footer, on the empty-state card, and on the expiration card. Total
            saturation across every page a user sees.
          </p>
        </Section>

        <Section heading="WHAT YOU GET (ANY SLOT)">
          <ul className="list-disc pl-6 space-y-1">
            <li>Logo + tagline live for a full calendar month.</li>
            <li>
              <strong>Disclosed paid link for referral traffic.</strong> We mark it{' '}
              <code>rel="sponsored"</code> per Google's rules — qualified clicks, not
              laundered link equity.
            </li>
            <li>Click-through tracking (anonymized) reported at month end.</li>
            <li>One shout-out social post when the slot goes live.</li>
            <li>UTM-tagged outbound link — no shared attribution mystery.</li>
            <li>Early-sponsor rate locks for as long as you stay booked.</li>
          </ul>
          <p className="mt-3 text-[12px] opacity-70">
            Acceptance is at our sole discretion (see{' '}
            <a href="/terms#sponsor" className="underline">
              Terms §6
            </a>
            ). We reserve the right to refuse, modify, or terminate any sponsorship for any
            reason. Cause-based terminations are non-refundable; discretionary terminations are
            pro-rated. We don't run ads we can't stand next to.
          </p>
        </Section>

        <Section heading="THE NUMBERS (BETA)">
          <p>
            Stats are placeholder while the beta builds an audience. Ask for the current figure
            and we'll send last month's impressions + click data with the proposal.
          </p>
        </Section>

        <Section heading="HOW TO BOOK">
          <p>
            Email <ObfuscatedEmail className="underline" /> with the slot(s) you want. We send an
            invoice, you wire the payment, the slot goes live within a few days. Self-serve
            checkout is a v2 thing.
          </p>
        </Section>
      </div>
    </main>
    </>
  );
}

function SlotCard({ slot }: { slot: SlotConfig }) {
  const sponsor = getSlotSponsor(slot.id);
  const paid = isPaidSlot(slot.id);
  return (
    <article
      id={slotAnchor(slot.id)}
      className="border-[3px] border-ink rounded-2xl bg-paper p-4 sm:p-5 shadow-brutal-sm scroll-mt-20"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h3 className="font-display text-lg tracking-widest">{slot.shortLabel}</h3>
        <span className="font-display text-xl tracking-wider">
          ${slot.price}
          <span className="text-xs opacity-60">/mo</span>
        </span>
      </header>
      <p className="text-sm leading-relaxed opacity-80 mb-2">{slot.description}</p>
      <p className="text-[12px] opacity-70 mb-3">
        <strong className="font-display tracking-wider text-[10px] mr-1">AUDIENCE:</strong>
        {slot.audience}
      </p>
      <dl className="text-[12px] opacity-80 mb-4 space-y-1">
        <SpecRow label="LOGO" value={slot.specs.logo} />
        <SpecRow label="NAME" value={slot.specs.name} />
        <SpecRow label="TAGLINE" value={slot.specs.tagline} />
        {slot.specs.notes && slot.specs.notes.length > 0 && (
          <div>
            <dt className="font-display tracking-wider text-[10px] inline mr-1">NOTES:</dt>
            <dd className="inline">
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                {slot.specs.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>
      <div className="border-t-2 border-ink/10 pt-3">
        <p className="font-display text-[9px] tracking-widest opacity-60 mb-2">
          {paid ? 'CURRENTLY SPONSORED BY' : 'OPEN SLOT — CURRENTLY SHOWING'}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-display tracking-wider">{sponsor.name}</span>
          <span className="opacity-70">— {sponsor.tagline}</span>
        </div>
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer font-display text-[10px] tracking-widest opacity-60 hover:opacity-100 list-none">
          ▾ PREVIEW THE SLOT IN PLACE
        </summary>
        <div className="mt-3 p-3 border-2 border-dashed border-ink/20 rounded-xl">
          <SponsorBadge slot={slot.id} />
        </div>
      </details>
    </article>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-display tracking-wider text-[10px] inline mr-1">{label}:</dt>
      <dd className="inline">{value}</dd>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-base tracking-widest">{heading}</h2>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}
