# Internet Crafters portal analytics

The Netlify build installs the reviewed GitHub client from
`Steve-And-Fay/public-internet-crafters-client#main` and runs its installation doctor before the
normal site build. Requires client 0.3.1 or later for private-page filtering.

Use portal site `01M1AXX0KZWXV9KAANFMTSR31S` (mugsprite.com), belonging to Steve Bullis. Give this
exact hostname its own installation token. Runtime variables belong to the production context and
Functions scope; do not commit the token or expose it in Vite variables.

```dotenv
IC_ANALYTICS_ENABLED=true
IC_ANALYTICS_INGEST_URL=https://my.internetcrafters.com/ingest/v1/events
IC_ANALYTICS_INGEST_TOKEN=site-specific-secret
IC_ANALYTICS_PUBLIC_PATHS=["/","/terms","/privacy","/sponsor","/faq"]
```

Configure the public-path allowlist together with the token before enabling the first deployment.
Do not include room URLs, admin pages, MCP/API endpoints, tokens, or user identifiers. The shared
client skips private document injection, SPA events/errors, private same-site link destinations,
and crawler requests. Its collector independently rejects excluded paths.

Mugsprite's existing in-house product analytics, room pings, sponsor redirects, cleanup, Neon
database, SSE functions, and MCP behavior remain unchanged. Portal figures are a separate public-
page view, not a replacement for the product's owner dashboard. Room creation is explicitly ignored
by portal analytics and is not a contact lead. Email controls have a dedicated email action; no
contact form is present, so no confirmed-form events are invented.

The policy distinguishes session-based public-page reporting from the existing product statistics.
With DNT/GPC, portal events are anonymous minute-rounded counts without session linking, attribution,
action details, or errors. No answers, messages, room identifiers, contact addresses, or query values
are forwarded to the portal. Raw portal events last 90 days; aggregates and grouped issues remain.

## Source and deployment

The live assets were rebuilt and matched from local `mug-builder` commit `18f53bc`, not the stale
GitHub `main` at `a8b90cc`. The user authorized publishing that already-live history and updating
`main` before this analytics change. Keep unrelated local notes out of commits.

The Netlify site is `8d3df68c-bce0-495b-9e37-627cbf8706a7`. It was manually deployed; verify the exact
production build and all existing functions before a new manual release. Do not create rooms, send
MCP events, submit forms, or generate errors as a production health probe. A normal public-page
visit and internal link are enough for delivery acceptance.

## Check this document against

- `netlify.toml`
- `src/App.tsx`
- `src/pages/LandingPage.tsx`
- `src/components/ObfuscatedEmail.tsx`
- `src/pages/LegalPage.tsx`
- `src/pages/__tests__/LegalPage.test.tsx`
