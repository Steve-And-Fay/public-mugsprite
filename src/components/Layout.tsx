import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ObfuscatedEmail } from './ObfuscatedEmail';
import { SponsorBadge } from './SponsorBadge';
import { isPaidSlot, SLOTS, sponsorPageLink } from '../lib/sponsor';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <BetaBanner />
      <div id="main" className="flex-1 flex flex-col">
        {children}
      </div>
      <Footer />
    </div>
  );
}

function BetaBanner() {
  return (
    <div
      role="alert"
      className="bg-accent-yellow border-b-[3px] border-ink px-4 py-1.5 text-center font-display text-[10px] sm:text-xs tracking-widest"
    >
      <span className="inline-block bg-ink text-paper rounded px-2 py-0.5 mr-2">BETA</span>
      EXPERIMENTAL · PROVIDED AS-IS · NO UPTIME GUARANTEE ·{' '}
      <a
        href="https://github.com/Steve-And-Fay/public-mugsprite/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline"
      >
        SOURCE
      </a>
    </div>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t-[3px] border-ink bg-paper px-4 py-4 mt-8">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="opacity-70 text-center sm:text-left max-w-prose" style={{ textWrap: 'pretty' }}>
            ©{' '}
            <a
              href="https://steveandfay.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {year} Steve and Fay LLC
            </a>
            . All rights reserved. Mugsprite is provided as-is,{' '}
            <span className="whitespace-nowrap">with no warranties</span> — please be patient
            with it.
          </p>
          <nav className="flex items-center gap-4 font-display tracking-widest text-[10px]">
            <Link to="/faq" className="hover:underline">
              FAQ
            </Link>
            <Link to="/terms" className="hover:underline">
              TERMS
            </Link>
            <Link to="/privacy" className="hover:underline">
              PRIVACY
            </Link>
            <Link to="/sponsor" className="hover:underline">
              SPONSOR
            </Link>
            <a
              href="https://github.com/Steve-And-Fay/public-mugsprite/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline inline-flex items-center gap-1"
              aria-label="Mugsprite on GitHub"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.01c-3.2.69-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.17a11.1 11.1 0 0 1 2.89-.39c.98 0 1.97.13 2.89.39 2.21-1.49 3.18-1.17 3.18-1.17.63 1.59.23 2.76.11 3.05.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.37-5.25 5.65.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
              </svg>
              GITHUB
            </a>
            <ObfuscatedEmail className="hover:underline" label="CONTACT" />
          </nav>
        </div>
        <div className="text-center sm:text-right text-[11px] opacity-70">
          {isPaidSlot('room_footer') ? 'Made by Internet Crafters · Sponsored by ' : 'Made by '}
          <SponsorBadge slot="room_footer" />
          {!isPaidSlot('room_footer') && (
            <>
              {' · '}
              <Link
                to={sponsorPageLink('room_footer')}
                className="hover:underline opacity-70"
                aria-label={`Sponsor this slot for $${SLOTS.room_footer.price} per month`}
              >
                sponsor this slot (${SLOTS.room_footer.price}/mo) →
              </Link>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
