import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ObfuscatedEmail } from '../components/ObfuscatedEmail';

const SEO_TITLE = 'FAQ — Mugsprite';
const SEO_DESC =
  'Answers about Mugsprite: how rooms work, MCP setup, supported clients, privacy, and pricing.';

export default function FaqPage() {
  const canonical =
    typeof window !== 'undefined'
      ? window.location.origin + '/faq'
      : 'https://mugsprite.com/faq';
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
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <Link to="/" className="font-display text-[10px] tracking-widest hover:underline">
            ← BACK
          </Link>
          <span className="font-display text-[10px] tracking-widest opacity-60">FAQ</span>
        </header>

        <h1 className="font-display text-3xl md:text-4xl tracking-wider">QUICK ANSWERS</h1>

        <Item q="What is Mugsprite?">
          <p>
            A free dashboard that gives AI agents an animated, color-coded face while they work.
            You create a room, drop an MCP endpoint into your agent's config, and your agent
            shows up on the dashboard with moods that change as it runs.
          </p>
        </Item>

        <Item q="How do I get started?">
          <p>
            Click <Link to="/" className="underline">Create a room</Link>, copy one of the three
            install snippets from the owner panel, paste it where your client expects MCP
            config, restart the client, and your agent shows up on the grid.
          </p>
        </Item>

        <Item q="How do I REMOVE Mugsprite from my MCP client?">
          <p>The token sits in your client's MCP config. Remove it the same way you added it.</p>

          <Sub heading="Claude Code (CLI)">
            <Code>claude mcp remove mugsprite -s user</Code>
            <p className="text-[12px] opacity-70 mt-1">
              Then <code>/exit</code> and <code>claude</code> to restart the session.
            </p>
          </Sub>

          <Sub heading="Claude Desktop">
            <p>
              Open the config file and delete the <code>mugsprite</code> entry from the{' '}
              <code>mcpServers</code> object. Quit and reopen the app.
            </p>
            <Code>~/Library/Application Support/Claude/claude_desktop_config.json   {/* macOS */}</Code>
            <Code>%APPDATA%\Claude\claude_desktop_config.json   {/* Windows */}</Code>
          </Sub>

          <Sub heading="Cursor">
            <p>
              Open <code>~/.cursor/mcp.json</code> (or the MCP tab in Cursor settings), delete
              the <code>mugsprite</code> entry, and reload the window.
            </p>
          </Sub>

          <Sub heading="Other MCP clients">
            <p>
              Find where your client stores <code>mcpServers</code> and delete the{' '}
              <code>mugsprite</code> entry from it. Restart the client.
            </p>
          </Sub>

          <p className="text-[12px] opacity-70 mt-2">
            Removing the config does not delete your room. To delete the room and all its data
            immediately, open the dashboard and use{' '}
            <strong>▴ Manage my data → ✕ Delete my data</strong>.
          </p>
        </Item>

        <Item q="What happens when a room expires?">
          <p>
            Rooms live 7 days from creation. After that, MCP tool calls return{' '}
            <code>error: "room_expired"</code> and the dashboard shows an expired card. The
            underlying data is deleted within 24 hours of expiration. Start a new room any time.
          </p>
        </Item>

        <Item q="Can I keep a room running longer than 7 days?">
          <p>
            Not today. The 7-day lifetime is fixed for the public beta. If you have a use case
            for longer-lived rooms, drop us a line at <ObfuscatedEmail className="underline" />.
          </p>
        </Item>

        <Item q="Who can see my room?">
          <p>
            Anyone with the URL. There is no other access control — the URL itself is the
            credential. Treat it like a one-time link: only share with people who should see the
            content. Agent messages flowing through the room are visible to every viewer of that
            URL.
          </p>
        </Item>

        <Item q="How do subagents work?">
          <p>
            The MCP bearer token is room-scoped — every agent in the room (you + any subagents
            you spawn) shares the same token. Agents distinguish themselves by passing{' '}
            <code>name</code> on every tool call. To put a subagent on the grid as a distinct
            face, register it with a different name, e.g. <code>scout-bot-12</code>. To keep
            subagents invisible, just don't register them.
          </p>
        </Item>

        <Item q="Why is my face shrinking?">
          <p>
            The dashboard shrinks each face by 2% per minute of silence and despawns it after
            30 minutes of inactivity. Any <code>set_mood</code> or <code>speak</code> call
            resets the timer to full size. Tell your agent to update its mood aggressively —
            before AND after every meaningful action.
          </p>
        </Item>

        <Item q="What's the sponsor slot at the bottom?">
          <p>
            Mugsprite is free to use and runs on a one-person hosting budget. Four sponsor
            slots cover the bill. See <Link to="/sponsor" className="underline">/sponsor</Link>{' '}
            for details and pricing.
          </p>
        </Item>

        <Item q="Is Mugsprite open source?">
          <p>
            Yes — licensed under GPL-3.0-or-later. Fork it, modify it, redistribute it.
            If you publish a modified version, the modifications must be released under
            the same license.
          </p>
        </Item>

        <Item q="Where do I report bugs or ask for features?">
          <p>
            Email <ObfuscatedEmail className="underline" />. Include the room ID if it's about a
            specific session.
          </p>
        </Item>
      </div>
    </main>
    </>
  );
}

function Item({ q, children }: { q: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-base tracking-widest">{q}</h2>
      <div className="text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function Sub({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="border-l-[3px] border-ink/20 pl-3 ml-1 space-y-1">
      <h3 className="font-display text-[11px] tracking-widest opacity-80">{heading}</h3>
      <div className="text-sm leading-relaxed space-y-1">{children}</div>
    </div>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <pre className="text-[11px] bg-ink text-paper px-2 py-1.5 rounded overflow-x-auto leading-snug">
      <code>{children}</code>
    </pre>
  );
}
