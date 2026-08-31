# Mugsprite

Visual presence layer for AI agents. Drop an MCP endpoint into any agent's config and it projects a personality-colored, expression-animated face onto a shared web dashboard while it works. Multiple agents = grid of faces. Color = personality (fixed per agent). Mood = state (driven by lifecycle events).

## Stack

- **Frontend:** React 18 + TypeScript + Vite + React Router + Tailwind.
- **Backend:** Netlify Functions (REST) + Netlify Edge Functions (SSE).
- **Database:** Netlify DB (managed Neon Postgres), queried via `@netlify/neon`.
- **Realtime:** Server-Sent Events; events table polled every 1s. No WebSockets — Netlify Functions don't support them.
- **Agent API:** MCP Streamable HTTP (JSON-RPC 2.0 over POST) at `/mcp`.

## Quick start

```bash
nvm use                # Node 20
npm install
netlify link           # connect to a Netlify site (or `netlify init`)
netlify db init        # provision Netlify DB; injects NETLIFY_DATABASE_URL
npm run db:apply       # apply db/schema.sql (needs NETLIFY_DATABASE_URL in env)
npm run dev            # netlify dev on :8888 (vite on :5173 inside)
```

Visit <http://localhost:8888>, click **Create a Room**, and you'll land on the dashboard with an owner panel. Add an agent → copy the generated MCP snippet → paste it into your agent's MCP config.

## Repo layout

```
public/                     static assets (none required for v1)
src/
  components/Face.tsx       Animated SVG avatar (12 moods, breath/blink/talk)
  components/AgentGrid.tsx  Auto-rebalancing square tile grid
  components/OwnerPanel.tsx Add/remove agents, MCP snippet copy
  lib/api.ts                Typed fetch client for /api/*
  lib/useRoomStream.ts      EventSource → reducer state
  pages/                    Landing + Room
  shared/                   Types/schemas/moods shared with functions
netlify/
  functions/rooms.ts        POST/GET /api/rooms
  functions/agents.ts       POST/DELETE /api/agents
  functions/mcp.ts          JSON-RPC 2.0 MCP endpoint
  functions/llms.ts         /llms.txt and /r/:roomId/llms.txt
  edge-functions/stream.ts  SSE /api/stream/:roomId
db/schema.sql               Rooms, agents, events
```

## Auth model

Jitsi-style: knowing the room slug is enough to view the dashboard. Token-gated writes only.

- `owner_token` — issued once on room creation, returned in the URL query string. Required to add/remove agents.
- `agent_token` — issued per agent. Required on every `/mcp` request. Sent as `Authorization: Bearer <token>`.

Tokens are 32 bytes of crypto-random output, base64url-encoded. v1 stores them as-is; v2 should hash at rest.

## Scripts

```bash
npm run dev           Netlify Dev (Functions + Edge + Vite proxy)
npm run dev:vite      Vite only (no functions)
npm run build         tsc + vite build
npm run typecheck     tsc --noEmit across both projects
npm run lint          ESLint, --max-warnings 0
npm run format        Prettier write
npm run test          Vitest unit tests
npm run test:e2e      Playwright (will boot `npm run dev`)
npm run verify        typecheck + lint + test (use this before pushing)
```

## MCP tools exposed

| Tool             | Args                       | Behavior                                                            |
| ---------------- | -------------------------- | ------------------------------------------------------------------- |
| `mugsprite_register`  | `name`, `color`            | Idempotent. Resolves agent from bearer token. Updates color if changed. |
| `mugsprite_set_mood`  | `mood`                     | One of 12 moods. Pushes a `mood` event to the dashboard.            |
| `mugsprite_speak`     | `text`                     | Pushes a `speak` event. Dashboard runs Web Speech API client-side.  |
| `mugsprite_leave`     | —                          | Deletes the agent.                                                  |

All four write to `agents` and append to `events` in one round-trip. The SSE poll loop in `stream.ts` picks up new events and pushes them to every connected dashboard for that room.

## Notes for future work

The existing favicon has a raster companion for readers that do not accept SVG.
See [the source and regeneration notes](docs/favicon.md).

- **User accounts:** `rooms.owner_user_id` is nullable. Add a `users` table and start populating it when Netlify Identity is wired up — no migration needed for existing rooms.
- **Token storage:** v2 should store hashed tokens. Generate raw → hash → store hash → return raw once.
- **Event pruning:** add a scheduled function that trims `events` to the latest ~500 rows per room.
- **LISTEN/NOTIFY:** the 1s poll in `stream.ts` is fine for v1. Swap to Postgres `LISTEN/NOTIFY` if event volume gets high.
- **Stretch goals** (called out in the brief, not built): spotlight layout for the active speaker, `mugsprite_thinking(reasoning)` tool, per-agent voice picker, room ownership transfer, outbound webhooks for n8n integration.

## License

Mugsprite is licensed under the **GNU General Public License, version 3 or
later** (GPL-3.0-or-later). See [`LICENSE`](./LICENSE) for the full text.

Copyright (c) Steve and Fay LLC. You are free to use, modify, and redistribute
this software under the terms of the GPL. If you distribute a modified version,
the source must be made available under the same license.
