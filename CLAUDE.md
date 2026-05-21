# Mugsprite — Project Brief

Mugsprite is a service that lets any MCP-capable AI agent (Claude Code, Cursor, Codex, n8n flows, anything) project an animated character avatar onto a shared web dashboard while it works. Multiple agents = grid of mugs, each with their own personality color and name, expressions driven by lifecycle events.

The visual language: flat 2D vector character, neo-brutalist hard shadows on UI chrome, Fredoka + Bungee fonts, breathing/blinking/squash-stretch animation always running. **Color = personality (fixed per agent). Expressions = state (mood-driven).** 12 named expressions (idle, happy, excited, silly, singing, surprised, thinking, confused, sleepy, sad, angry, error). The implementation is original — no third-party character designs are copied or derived.

## Architecture (verify before deviating)

**Hosting:** Netlify. Use what Netlify gives us, work around what it doesn't.

- **Static frontend** → React + TypeScript + Vite, served by Netlify static hosting. Two pages: `/` (landing + "create room") and `/r/:roomId` (dashboard).
- **Persistent state** → **Netlify DB** (managed Neon Postgres). Provisioned with `netlify init db`, queried via `@netlify/neon`. Auto-injects `NETLIFY_DATABASE_URL`.
- **Real-time push to dashboard** → **Netlify Edge Function with Server-Sent Events**. Edge Functions support long-lived SSE streams. Use `ReadableStream` + `text/event-stream`.
- **Agent-facing API** → **MCP server using Streamable HTTP transport** (the 2025-03-26 spec, NOT legacy SSE transport). Single `/mcp` endpoint handles POST for tool calls. Implemented as a regular Netlify Function (per-invocation serverless model fits stateless JSON-RPC fine).
- **Discovery** → `/llms.txt` at the root + `/r/:roomId/llms.txt` per room.

**Why NOT WebSockets:** Netlify Functions don't support them. The SSE + POST split is the documented path and is exactly what MCP Streamable HTTP was designed for anyway.

## Database Schema (Netlify DB / Postgres)

See `db/schema.sql`. Three tables — `rooms`, `agents`, `events`. `rooms.owner_user_id` is nullable so adding user accounts later is non-breaking.

For the MVP, the SSE stream pumps from the `events` table using a 1-second polling loop inside the Edge Function. Switch to Postgres `LISTEN/NOTIFY` only if volume demands it.

## MCP Tools Exposed

All tools are prefixed `mugsprite_*` (underscore — some MCP clients reject dots in tool names). Each call writes to `agents` and appends to `events` in one round-trip.

- `mugsprite_register(name, color)` — idempotent; agents call once at startup. Auth via per-agent bearer token in the `Authorization` header.
- `mugsprite_set_mood(mood)` — one of the 12 moods listed above.
- `mugsprite_speak(text)` — show a speech bubble and trigger TTS in the dashboard. Web Speech API runs client-side; server doesn't synthesize.
- `mugsprite_leave()` — remove from grid cleanly.

**Auth model (Jitsi-style):**
- Knowing the room slug is enough to view the dashboard read-only.
- Room creator gets an `owner_token` (shown once in the URL query string, like a magic link).
- Owner generates per-agent tokens via dashboard: "+ Add agent → name → color → copy MCP config snippet."
- Agent's MCP config holds the bearer token. Token in `Authorization: Bearer <token>` header on every `/mcp` request.

## Repo Layout

```
public/                         static assets
src/
  components/Face.tsx           animated SVG avatar (12 moods, breath/blink/talk)
  components/AgentGrid.tsx      auto-rebalancing tile grid
  components/OwnerPanel.tsx     add/remove agents, copy MCP snippet
  lib/api.ts                    typed fetch client
  lib/useRoomStream.ts          EventSource → reducer state
  pages/                        landing + room
  shared/                       types/schemas shared with functions
netlify/
  functions/rooms.ts            POST/GET /api/rooms
  functions/agents.ts           POST/DELETE /api/agents
  functions/mcp.ts              JSON-RPC 2.0 MCP endpoint
  functions/llms.ts             /llms.txt and /r/:roomId/llms.txt
  edge-functions/stream.ts      SSE /api/stream/:roomId
db/schema.sql                   rooms, agents, events
```

## Hard Requirements

- **All 12 moods rendered faithfully.** Breath/blink/squash-stretch, accessory animations. Grid auto-rebalances via CSS Grid `repeat(ceil(sqrt(n)), 1fr)`.
- **No WebSockets.** SSE only for client; POST only for agents.
- **No long-running regular Functions.** SSE goes through Edge Functions specifically. Other Functions should respond in under 10s.
- **Idempotent agent registration.** If an agent calls `register` with a token that already corresponds to an agent, return the existing `agent_id`. Don't create duplicates.
- **Color fade transition** when an agent's color changes — CSS `transition: background-color 1.4s` on the avatar background.
- **Token security:** generate with `crypto.getRandomValues` → 32 bytes → base64url. Never log full tokens. Store as-is for v1 (hash for v2).
- **Use Web Speech API client-side for TTS.** Don't synthesize on the server. `mugsprite_speak` just pushes the text; the browser reads it.

## Out of Scope for v1

- OAuth / user accounts. Room tokens are the auth model.
- Multi-region.
- Persistent message history beyond the last ~500 events per room.
- Server-side TTS / phoneme-accurate lip sync. The randomized mouth cycle is the lip sync.
- Mobile UI. Dashboard is desktop-first.

## Stretch Goals (called out, not built)

- Spotlight / hero layout when one agent is actively speaking.
- `mugsprite_thinking(reasoning)` tool that shows internal monologue in a separate bubble.
- Per-agent voice picker (different Web Speech voices per agent).
- Room ownership transfer / multiple owners.
- Webhook OUT — push events to an external URL when an agent changes state (closes the loop for n8n flows).

## Definition of Done for v1

A user can: visit the site → click "Create room" → land on a dashboard with an empty grid → click "Add agent: SCOUT, color blue" → copy the displayed MCP JSON snippet → paste it into their agent's MCP config → restart the agent → ask it to "introduce yourself" → the dashboard shows SCOUT in the grid, going through `thinking` mood, then `speaking` while the speech text gets read aloud by the browser. Add a second agent and the grid splits to 2-up. Refresh the dashboard — agents are still there, last mood preserved.

## Working Notes for Claude Code

- The `Face` component name is descriptive of the SVG primitive, not branding. Don't rename it.
- The MCP tool prefix is `mugsprite_*` (underscore form — dotted names like `mugsprite.register` get filtered by stricter MCP clients like Cursor). Don't propose `face_*` or `mug_*`.
- Mugsprite status cadence + privacy posture (applies when you're working on THIS repo with mugsprite registered): call `mugsprite_set_mood` every 1–3 minutes. Statuses must be vague-but-not-empty, present-tense, no numbers, no completion claims, no library/framework names. "iterating on test coverage" — yes. "73 tests passing; user-journey coverage shipped" — no. See `src/shared/rules.ts` for the canonical guidance.
- The visual style is original work — generic flat-2D character primitives (ellipses, paths, basic SMIL animations). Don't introduce comparisons to specific licensed characters in code comments, docs, or marketing copy.
- Run `npm run verify` (typecheck + lint + test) before declaring work done.
