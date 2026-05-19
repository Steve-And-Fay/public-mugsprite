import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ObfuscatedEmail } from './ObfuscatedEmail';
import { SponsorBadge } from './SponsorBadge';

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
      EXPERIMENTAL · USE AT YOUR OWN RISK · NO UPTIME GUARANTEE
    </div>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t-[3px] border-ink bg-paper px-4 py-4 mt-8">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="opacity-70 text-center sm:text-left">
            ©{' '}
            <a
              href="https://steveandfay.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {year} Steve and Fay LLC
            </a>
            . All rights reserved. Mugsprite is provided as-is, with no warranty. Use at your own
            risk.
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
            <ObfuscatedEmail className="hover:underline" label="CONTACT" />
          </nav>
        </div>
        <div className="text-center sm:text-right text-[11px] opacity-70">
          Powered by Mugsprite · Sponsored by <SponsorBadge slot="room_footer" />
        </div>
      </div>
    </footer>
  );
}
