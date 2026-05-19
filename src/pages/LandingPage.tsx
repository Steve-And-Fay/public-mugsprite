import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { DemoHero } from '../components/DemoHero';
import { SponsorBadge } from '../components/SponsorBadge';
import { api } from '../lib/api';

const SEO_TITLE = 'Mugsprite — visual presence for AI agents';
const SEO_DESC =
  'A shared dashboard where AI agents project animated faces while they work. Create a free room and drop an MCP endpoint into any agent.';

export default function LandingPage() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!agreed) {
      setError('Please agree to the Terms and Privacy Policy.');
      return;
    }
    setCreating(true);
    try {
      const result = await api.createRoom();
      navigate(`/r/${result.room.id}?owner=${encodeURIComponent(result.ownerToken)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setCreating(false);
    }
  };

  const canonical =
    typeof window !== 'undefined' ? window.location.origin + '/' : 'https://mugsprite.com/';
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
    <main className="flex-1 flex items-start justify-center p-6 pt-10">
      <div className="max-w-4xl w-full text-center space-y-6">
        {/* Header pair: title + subtitle read together */}
        <header className="space-y-3">
          <h1 className="font-display text-4xl md:text-6xl tracking-wider">MUGSPRITE</h1>
          <p className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto opacity-80">
            Visual presence layer for AI agents. Drop an MCP endpoint into your agent's config
            and it shows up on a shared dashboard with a personality-colored, expression-animated
            face.
          </p>
        </header>

        {/* Supporting illustration */}
        <div className="py-2">
          <DemoHero />
        </div>

        {/* Primary action */}
        <form onSubmit={handleCreate} className="space-y-4 max-w-xl mx-auto">
          <label className="flex items-start gap-3 text-sm cursor-pointer text-left">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 accent-ink"
            />
            <span className="opacity-80">
              I agree to the{' '}
              <a href="/terms" className="underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="underline">
                Privacy Policy
              </a>
              , and understand this is a beta service used at my own risk.
            </span>
          </label>

          <p className="text-xs opacity-50 font-display tracking-widest text-center">
            ROOMS LAST 7 DAYS · ANYONE WITH THE LINK CAN WATCH · ONLY THE OWNER CAN ADD AGENTS
          </p>

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={creating || !agreed}
              className="w-full md:w-auto bg-accent-pink border-[3px] border-ink rounded-xl px-8 py-4 font-display text-base tracking-widest shadow-brutal hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? 'CREATING ROOM…' : '+ CREATE A ROOM'}
            </button>
          </div>
          {error && <p className="text-red-700 text-sm text-center">{error}</p>}
        </form>

        {/* Sponsor block — own section, generous whitespace + divider above */}
        <div className="pt-10 mt-6 border-t-[3px] border-ink/10">
          <SponsorBadge slot="home_hero" />
        </div>
      </div>
    </main>
    </>
  );
}
