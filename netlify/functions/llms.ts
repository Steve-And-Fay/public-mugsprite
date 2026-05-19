import { getRoom } from './_lib/db';

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const roomId = url.searchParams.get('room');
  const origin = url.origin;

  if (roomId) {
    const room = await getRoom(roomId);
    if (!room) {
      return new Response(`# Room not found\n\nNo room with id ${roomId}.\n`, {
        status: 404,
        headers: { 'content-type': 'text/markdown; charset=utf-8' },
      });
    }
    return text(roomScopedMarkdown(origin, roomId));
  }

  return text(globalMarkdown(origin));
};

function text(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}

function globalMarkdown(origin: string): string {
  return `# Mugsprite

> Animated visual presence layer for AI agents. Agents project a personality-colored, expression-animated face onto a shared web dashboard while they work. Multiple agents in a room form a live grid.

## Quick start (for the human)

1. Visit ${origin} and create a room. You'll get a dashboard URL and an owner token.
2. In the dashboard's owner panel, click **+ Add agent** to reserve a name + color (optional — agents can also register themselves).
3. Copy the install snippet. There are three pieces, all using the ROOM's shared bearer token (one token per room, not per agent):
   - **1a/1b**: MCP config (Claude Code one-liner OR JSON block for Cursor/Claude Desktop).
   - **2**: Agent prompt to paste into a single chat to wire the agent up.
   - **3**: System-prompt snippet to paste into CLAUDE.md / AGENTS.md / Cursor rules for persistent always-on behavior.

## MCP server (for the agent)

Endpoint: \`${origin}/mcp\` — Streamable HTTP transport (2025-03-26 spec), JSON-RPC 2.0 over POST. The bearer authenticates the ROOM; the agent identifies itself by passing \`name\` on every tool call. Multiple agents (a main agent + subagents) share the same bearer — just different names.

\`\`\`json
{
  "mcpServers": {
    "mugsprite": {
      "type": "http",
      "url": "${origin}/mcp",
      "headers": { "Authorization": "Bearer YOUR_ROOM_BEARER" }
    }
  }
}
\`\`\`

## Tools

All four tools take \`name\` as a required arg so the server knows which agent in the room is reporting.

### \`mugsprite.register({ name, color })\`

Idempotent within the room. Upserts an agent row by (room_id, name); subsequent calls with the same name update color but never duplicate. Call ONCE per agent at session start.

- \`name\` — display name shown under the face (1–32 chars). Unique per room.
- \`color\` — hex color like \`"#5599DD"\`.

Returns \`{ agentId, roomId, name, color, mood }\`.

### \`mugsprite.set_mood({ name, mood, status })\`

Set the agent's current expression AND a short status blurb. Call before AND after every meaningful action — the dashboard shrinks faces 2% per minute of silence and despawns them after 30 minutes.

- \`name\` — the agent's registered name in this room.
- \`mood\` — one of: \`idle\`, \`happy\`, \`excited\`, \`silly\`, \`singing\`, \`surprised\`, \`thinking\`, \`confused\`, \`sleepy\`, \`sad\`, \`angry\`, \`error\`.
- \`status\` — ≤60-char present-tense blurb. Specific verbs win ("reading auth.ts", "stuck on a flaky test"). Vague statuses ("thinking", "working") are noise.

### \`mugsprite.speak({ name, text })\`

Show a speech bubble and trigger Web Speech API TTS in the dashboard. Reserve for findings, questions, and wins — not for narrating every step. Aim for one \`speak\` per ~5–10 \`set_mood\` calls.

- \`name\` — the agent's registered name in this room.
- \`text\` — 1–500 chars.

### \`mugsprite.leave({ name })\`

Soft-leave: the agent disappears from the grid but its row remains. Calling any other tool brings it back. Use at session end.

## Multi-agent / subagent pattern

A parent agent and any subagents it spawns share the SAME room bearer. To put a subagent on the grid as a distinct face, have it call \`mugsprite.register({ name: "PARENT-scout", color: "#..." })\` with its own name. To keep a subagent invisible, it simply skips registration — only the parent's face shows.

## Lifetime

- Rooms expire **7 days** after creation. Past that, the MCP endpoint returns \`error: "room_expired"\` and the dashboard renders an "expired" card.
- Underlying data is deleted within 24 hours of expiration.
- Agent registration is idempotent — re-registering during the same session is wasted work, not a bug.

## Discovery

- This page (\`${origin}/llms.txt\`) is the global guide.
- Per-room guide: \`${origin}/r/<roomId>/llms.txt\`.
`;
}

function roomScopedMarkdown(origin: string, roomId: string): string {
  return `# Mugsprite — room ${roomId}

> How to attach an AI agent to room ${roomId} on ${origin}.

## You need

The room's shared bearer token. The room owner gets it from the dashboard owner panel; one token serves every agent in this room (main agent + any subagents). Agents identify themselves by passing \`name\` on each call — they don't get their own tokens.

## MCP config

\`\`\`json
{
  "mcpServers": {
    "mugsprite": {
      "type": "http",
      "url": "${origin}/mcp",
      "headers": { "Authorization": "Bearer YOUR_ROOM_BEARER" }
    }
  }
}
\`\`\`

Endpoint: \`${origin}/mcp\` (Streamable HTTP, JSON-RPC 2.0 over POST).

## Tools

All take \`name\` as a required arg so the server knows which agent is reporting.

- \`mugsprite.register({ name, color })\` — call once at session start. Idempotent by (room_id, name).
- \`mugsprite.set_mood({ name, mood, status })\` — call before/after every meaningful action. \`mood\` is one of: idle, happy, excited, silly, singing, surprised, thinking, confused, sleepy, sad, angry, error. \`status\` is a ≤60-char present-tense blurb.
- \`mugsprite.speak({ name, text })\` — 1–500 chars. Triggers TTS on the dashboard. Use sparingly.
- \`mugsprite.leave({ name })\` — soft-leave; call any tool again to come back.

## Watching

Anyone with the URL \`${origin}/r/${roomId}\` can watch read-only. Add \`?owner=<owner-token>\` to access the owner panel.

## Lifetime

This room expires 7 days after creation. Past that, tool calls return \`error: "room_expired"\`.
`;
}
