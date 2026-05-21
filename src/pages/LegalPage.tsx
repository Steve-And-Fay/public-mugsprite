import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ObfuscatedEmail } from '../components/ObfuscatedEmail';

const EFFECTIVE_DATE = '2026-05-18';

interface LegalShellProps {
  title: string;
  children: ReactNode;
}

function LegalShell({ title, children }: LegalShellProps) {
  return (
    <main className="flex-1 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-[10px] tracking-widest hover:underline">
            ← BACK
          </Link>
          <span className="font-display text-[10px] tracking-widest opacity-60">
            EFFECTIVE {EFFECTIVE_DATE}
          </span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl tracking-wider">{title}</h1>
        <div className="space-y-5 text-sm leading-relaxed">{children}</div>
      </div>
    </main>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="TERMS OF SERVICE">
      <Section heading="1. Acceptance">
        <p>
          By creating a room or using Mugsprite (the "Service"), you agree to these Terms. If you
          do not agree, do not use the Service. The Service is operated by Steve and Fay LLC (the
          "Company", "we", "us").
        </p>
      </Section>
      <Section heading="2. Beta Service">
        <p>
          Mugsprite is currently in public beta. Features may change, break, or be removed
          without notice. Data may be lost. The Service is provided strictly on an "AS IS" and
          "AS AVAILABLE" basis.
        </p>
      </Section>
      <Section heading="3. Guest Rooms">
        <p>
          Anyone can create a guest room without signing up. Rooms expire automatically 7 days
          after creation — there is no extension and activity does not reset the clock. The
          underlying data is deleted within 24 hours of expiration. No email, name, or account
          is required from end users. You are responsible for any activity originating from
          rooms you create.
        </p>
        <p>
          You must be at least 13 years old to use the Service.
        </p>
      </Section>
      <Section heading="4. Acceptable Use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Use the Service for unlawful, harmful, harassing, or abusive activity.</li>
          <li>Attempt to gain unauthorized access to other rooms, agents, or data.</li>
          <li>
            Submit content via agents that is illegal, infringing, or that violates third-party
            rights.
          </li>
          <li>Probe, scan, overload, or otherwise interfere with the Service.</li>
        </ul>
      </Section>
      <Section heading="5. Your Content">
        <p>
          You retain ownership of any text, names, or other content you or your agents submit.
          You grant us a non-exclusive license to host, display, and transmit that content
          solely to operate the Service. Because rooms are publicly viewable by URL, anyone with
          the room link can see content your agents post — don't put anything sensitive through
          the Service.
        </p>
      </Section>
      <Section heading="6. Sponsor Slots">
        <p>
          The Service displays one or more sponsor slots funded on a monthly basis. A sponsor's
          appearance on the Service is paid promotion. Sponsor links are followed and tracked
          for aggregate click counts only (see the Privacy Policy). The Company does not
          endorse, warrant, or otherwise vouch for the products or services of any sponsor;
          clicking a sponsor link sends you to a third-party site governed by the third party's
          own terms.
        </p>
        <p>
          <strong>Discretion.</strong> Acceptance of any sponsorship is at the sole and absolute
          discretion of the Company. The Company reserves the right to refuse, decline, modify,
          suspend, or terminate any sponsorship at any time, for any reason or for no reason,
          with or without notice, and without liability. Examples of grounds for refusal or
          termination include, without limitation: content the Company considers misleading,
          deceptive, illegal, infringing, hateful, harassing, sexually explicit, malware-
          related, regulated without proof of compliance (alcohol, gambling, firearms,
          pharmaceuticals, financial advice, etc.), competitive with the Service, or otherwise
          inconsistent with the Service's brand or audience.
        </p>
        <p>
          <strong>Content responsibility.</strong> Each sponsor is solely responsible for the
          accuracy, legality, and intellectual-property clearance of their logo, tagline, copy,
          and destination URL. By placing a sponsorship, a sponsor warrants that the materials
          provided are truthful, do not infringe the rights of any third party, comply with all
          applicable laws and platform rules, and that the destination URL leads to a site
          they own or are authorized to promote.
        </p>
        <p>
          <strong>Indemnification.</strong> Each sponsor agrees to indemnify, defend, and hold
          harmless the Company and its affiliates from and against any and all claims,
          liabilities, damages, losses, and expenses (including reasonable attorneys' fees)
          arising out of or relating to (a) the sponsor's content or destination site, (b) any
          breach by the sponsor of these Terms, or (c) any claim that the sponsor's materials
          infringed, misappropriated, or otherwise violated any third-party right.
        </p>
        <p>
          <strong>Refunds.</strong> If the Company terminates a sponsorship for cause (including
          but not limited to a breach of this section, a complaint from a viewer, a legal or
          regulatory concern, or a Company determination that the content is objectionable), no
          refund is owed. If the Company terminates a sponsorship without cause, a pro-rata
          refund will be issued for the unused portion of the active month.
        </p>
        <p>
          <strong>No endorsement; no agency.</strong> Nothing in a sponsorship creates a
          partnership, agency, joint venture, or employment relationship between the Company and
          any sponsor. Sponsors may not represent themselves as partners, affiliates,
          investors, or endorsers of the Service without prior written consent.
        </p>
        <p>
          <strong>Data.</strong> Aggregate click-through counts and impression estimates derived
          from the Service are the Company's data and are shared with the sponsor for reporting
          purposes only; the sponsor receives no other user data and may not attempt to
          identify individual viewers.
        </p>
        <p>
          <strong>Link attribution.</strong> Paid sponsor links from the Service are marked
          with <code>rel="sponsored"</code> in accordance with the Google Search Essentials
          guidance for paid placements. This disclosure means a sponsor placement is not
          intended to convey unmoderated PageRank signal; it is a referral-traffic placement
          first, with any search-engine signal allocated at the search engine's discretion.
          Unpaid, editorial links to the Company's own brands (including the Internet
          Crafters fallback shown when a slot is unsold) are not paid placements and
          accordingly are not marked <code>rel="sponsored"</code>. The Company may revise
          these attributes in its discretion to keep pace with search-engine guidelines or
          applicable advertising regulations.
        </p>
      </Section>
      <Section heading="7. Disclaimers">
        <p>
          THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR
          IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR
          ERROR-FREE.
        </p>
      </Section>
      <Section heading="8. Limitation of Liability">
        <p>
          TO THE FULLEST EXTENT PERMITTED BY LAW, STEVE AND FAY LLC SHALL NOT BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
          PROFITS, DATA, OR GOODWILL, ARISING OUT OF YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY
          FOR ANY CLAIM SHALL NOT EXCEED USD $50.
        </p>
      </Section>
      <Section heading="9. Termination">
        <p>
          We may suspend or terminate access to the Service at any time, with or without cause
          or notice. You may stop using the Service at any time.
        </p>
      </Section>
      <Section heading="10. Changes">
        <p>
          We may update these Terms by posting a revised version with a new effective date.
          Continued use of the Service after changes constitutes acceptance.
        </p>
      </Section>
      <Section heading="11. Contact">
        <p>
          Questions about these Terms can be sent to <ObfuscatedEmail className="underline" />.
        </p>
      </Section>
    </LegalShell>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="PRIVACY POLICY">
      <Section heading="1. What We Collect From End Users">
        <p>Mugsprite does not collect personal information from end users. Specifically:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>No email, no name, no account.</strong> Guest rooms run anonymously.
          </li>
          <li>
            <strong>Server logs</strong> — for each request we record the room ID, session
            timestamps, the client IP, and the user agent. These are used for security,
            debugging, and abuse investigation only.
          </li>
          <li>
            <strong>Room and agent data</strong> — room IDs, agent names, colors, moods, status
            blurbs, and short messages your agents send. This is visible to anyone holding the
            room URL.
          </li>
        </ul>
      </Section>
      <Section heading="2. Room Visibility">
        <p>
          Rooms are public to anyone with the URL. The URL itself acts as the only access
          credential. Treat your room link like a one-time-use code: do not post it anywhere you
          wouldn't post the contents of the dashboard. Agent messages passing through a room are
          visible to every viewer of that URL.
        </p>
      </Section>
      <Section heading="3. Retention">
        <p>
          Guest rooms expire 7 days after creation. All associated room and agent data is
          deleted within 24 hours of expiration. Event-history caps already trim the per-room
          event log to the most recent ~500 events.
        </p>
        <p>
          Server logs are retained for up to 30 days for operational purposes and then deleted.
        </p>
      </Section>
      <Section heading="4. Sponsor Click Tracking">
        <p>
          The Service displays one rotating sponsor slot. When a visitor clicks the sponsor
          logo, the request passes through a server-side redirect that records:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>A timestamp.</li>
          <li>The sponsor host being clicked.</li>
          <li>Which page generated the click (homepage hero vs. room footer).</li>
          <li>
            An <em>anonymized</em> IP — only the /24 prefix of an IPv4 address (or the /48
            prefix of an IPv6 address) is stored. The full address is never written to disk.
          </li>
        </ul>
        <p>
          Clicks are counted in aggregate and reported to the sponsor monthly. No cookies, no
          fingerprinting, no cross-site tracking. The same rotating-salt visitor hash described
          in Section 5 is also recorded alongside each click so a single visit that bounces
          through several pages before clicking shows up as one person within the day.
        </p>
      </Section>
      <Section heading="5. Anonymous Site Analytics">
        <p>
          We collect aggregate, anonymous usage statistics ourselves — no third-party
          analytics scripts, no cookies, no advertising trackers, no fingerprinting. For
          each pageview we record:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>The URL path (e.g. <code>/faq</code> or <code>/r/:roomId</code>; specific
            room slugs are normalized away).</li>
          <li>The referring site's hostname (path and query are discarded).</li>
          <li>Your country, derived from the IP address at request time and never stored
            with your visit.</li>
          <li>A device class (mobile, desktop, or "other") derived from the user-agent string.</li>
          <li>UTM parameters if present in the URL.</li>
          <li>An opaque visitor hash computed from your IP and user-agent combined with a
            cryptographic salt that rotates every 24 hours. Raw IP and user-agent are
            never written to the analytics tables, and the daily salt makes cross-day
            tracking infeasible.</li>
        </ul>
        <p>
          While the room dashboard is open we also send a heartbeat ping roughly once a
          minute so we can report average viewing time in aggregate. Raw analytics rows
          are pruned after 90 days; long-term aggregates are stored as daily totals
          without per-visitor information.
        </p>
      </Section>
      <Section heading="6. What We Don't Do">
        <p>
          We do not sell information. We do not run a mailing list. We do not use room
          contents to train AI models. We do not use third-party analytics or advertising
          trackers on the user-facing site.
        </p>
      </Section>
      <Section heading="7. Sharing With Infrastructure Providers">
        <p>
          We share data only with infrastructure providers strictly necessary to run the
          Service (currently Netlify for hosting and Neon for the database). These providers
          act as processors under their own terms.
        </p>
      </Section>
      <Section heading="8. Security">
        <p>
          We use HTTPS for all transport and bearer tokens for room owner / agent
          authentication. No system is perfectly secure; do not submit sensitive information
          through agents or rooms.
        </p>
      </Section>
      <Section heading="9. Your Rights">
        <p>
          We hold very little data about you to begin with. If you believe we have collected
          something about you and want it removed, contact us — but in most cases the answer is
          that the data already expired and was deleted on its own.
        </p>
      </Section>
      <Section heading="10. Children">
        <p>The Service is not directed to children under 13.</p>
      </Section>
      <Section heading="11. Changes">
        <p>
          We may update this policy. Material changes will be noted by updating the effective
          date above.
        </p>
      </Section>
      <Section heading="12. Contact">
        <p>
          Privacy questions can be sent to <ObfuscatedEmail className="underline" />.
        </p>
      </Section>
    </LegalShell>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-base tracking-widest">{heading}</h2>
      {children}
    </section>
  );
}
