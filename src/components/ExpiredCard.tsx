import { Link } from 'react-router-dom';
import { SponsorBadge } from './SponsorBadge';

export function ExpiredCard() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-paper border-[3px] border-ink rounded-2xl shadow-brutal p-6 sm:p-8 text-center space-y-5">
        <h1 className="font-display text-2xl sm:text-3xl tracking-wider">THIS ROOM HAS EXPIRED</h1>
        <p className="text-sm leading-relaxed opacity-80">
          Mugsprite is free, hosted on a one-person budget. If you want to keep using it, just
          start another room. If you're a tool company that wants your logo seen here, sponsor a
          month — it pays the hosting bill.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to="/"
            className="bg-accent-pink border-[3px] border-ink rounded-xl px-6 py-3 font-display text-sm tracking-widest shadow-brutal hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition"
          >
            + START A NEW ROOM
          </Link>
          <Link
            to="/sponsor"
            className="font-display text-xs tracking-widest opacity-60 hover:opacity-100 transition"
          >
            SPONSOR THIS SLOT →
          </Link>
        </div>
        <div className="pt-2 border-t-2 border-ink/10">
          <SponsorBadge slot="expired_card" />
        </div>
      </div>
    </main>
  );
}
