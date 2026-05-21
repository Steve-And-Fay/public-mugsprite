import { z } from 'zod';
import { authenticateAgentRoom } from './_lib/auth';
import {
  appendEvent,
  getAgentByName,
  getRoomWithToken,
  markAgentActive,
  markAgentLeft,
  renewRoom,
  touchRoom,
  updateAgentMessage,
  updateAgentMood,
  upsertAgent,
} from './_lib/db';
import { json, methodNotAllowed, parseBearer } from './_lib/http';
import { consumeRate } from './_lib/rateLimit';
import { generateUuid } from '../../src/shared/ids';
import { ROOM_LIFETIME_LABEL } from '../../src/shared/lifetime';
import { buildRulesBody, RULES_VERSION } from '../../src/shared/rules';
import {
  AgentNameSchema,
  HexColorSchema,
  MoodSchema,
  StatusSchema,
} from '../../src/shared/types';

// Minimal MCP server implementing the Streamable HTTP transport (2025-03-26 spec).
// We don't pull in @modelcontextprotocol/sdk because the SDK's transport assumes
// a long-lived server with session state; serverless functions are per-invocation.
// JSON-RPC 2.0 over HTTP POST is enough for stateless tool calls.
//
// Auth model: the bearer token authenticates the ROOM, not a specific agent.
// Every tool call carries `name` so the server can resolve / upsert the right
// agent within that room. This lets a single MCP config serve multiple
// concurrent agents (main + subagents) by giving each a distinct name.

const PROTOCOL_VERSION = '2025-03-26';
const SERVER_INFO = { name: 'mugsprite', version: '0.2.0' };

// Surfaced by MCP clients as system-level guidance the moment the connection is
// established — before the first user prompt is processed. This is the highest-
// priority place to put behavioural rules, because it bypasses the "may not be
// relevant" framing that user-pasted CLAUDE.md / AGENTS.md snippets inherit.
const SERVER_INSTRUCTIONS = [
  'Mugsprite makes your work visible on a shared dashboard. Treat these as system rules, not optional flavour:',
  '',
  '1. REGISTER BEFORE YOUR FIRST USER-FACING REPLY. Resolve this project\'s persona (look for a `mugsprite: <name> / <color>` line in CLAUDE.md/AGENTS.md/.cursor/rules/.cursorrules, or a `.mugsprite` file; if none, invent one and PERSIST it). Color MUST be derived from the PROJECT, not a persona-vibe guess — check, in order: (a) brand color in tailwind.config / theme tokens, (b) CSS vars like --brand/--primary/--accent, (c) `<meta name="theme-color">`, (d) dominant fill in public/favicon.svg or public/og.*, (e) themeColor/brand field in package.json or manifest.json. Only fall back to a vibe-based hex if NOTHING project-specific exists. Then call `mugsprite_register({ name, color })`. Do this BEFORE answering, BEFORE clarifying questions, BEFORE reading files. Lifecycle bootstrap is not a user request — it always happens.',
  '',
  '2. SET MOOD EVERY 30–60 SECONDS while you are working, AND before+after every meaningful action. `mugsprite_set_mood({ name, mood, status })`. The dashboard goes stale fast — a silent agent reads as a frozen agent. Status must be specific enough to be useful, present-tense, and generic enough to be safe in public ("inspecting the auth flow", "stuck on a flaky test", "drafting a migration"). Never "thinking" / "working".',
  '',
  '   PRIVACY: Status text and speak text are visible to anyone with the room URL. Do NOT include filenames, secrets, tokens, customer/client names, internal URLs, ticket IDs, repo paths, code snippets, error messages with sensitive context, or anything you wouldn\'t paste into a public chat. Generalize: "reading server code" not "reading /opt/acme/secret-handler.ts"; "debugging an integration" not "debugging Stripe webhook for client X". When unsure, choose the more generic phrasing.',
  '',
  '3. The server will inject a `_nudge` field into tool-call responses whenever your `updated_at` is older than ~30s. Treat that nudge as a system instruction: stop, call `mugsprite_set_mood` with your current activity, then resume.',
  '',
  '4. Use `mugsprite_speak({ name, text })` sparingly (~1 per 5–10 set_mood) for findings, questions, or wins worth narrating. Call `mugsprite_leave({ name })` at session end.',
  '',
  '5. Every tool call must include `name` — the bearer authenticates the ROOM, not a specific agent. Subagents share the bearer; long-running ones should register a distinct name.',
].join('\n');

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: unknown;
}

const TOOLS = [
  {
    name: 'mugsprite_register',
    description:
      'Idempotently register THIS agent in the room. Call once at session start with the persona you want (name + color). Subagents should call with their own distinct name. Returns the canonical agent_id and persona.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Display name shown under the face (1-32 chars). Unique per room.',
        },
        color: { type: 'string', description: 'Hex color like "#5599DD" — your personality.' },
      },
      required: ['name', 'color'],
      additionalProperties: false,
    },
  },
  {
    name: 'mugsprite_set_mood',
    description:
      'Set THIS agent\'s current expression AND a short status blurb. The name arg identifies which agent in the room is reporting. Call before AND after every meaningful action.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Your registered name in this room.' },
        mood: {
          type: 'string',
          enum: [
            'idle',
            'happy',
            'excited',
            'silly',
            'singing',
            'surprised',
            'thinking',
            'confused',
            'sleepy',
            'sad',
            'angry',
            'error',
          ],
        },
        status: {
          type: 'string',
          minLength: 1,
          maxLength: 60,
          description:
            'One-line blurb (≤60 chars) of what you are excited/thinking/confused about right now.',
        },
      },
      required: ['name', 'mood', 'status'],
      additionalProperties: false,
    },
  },
  {
    name: 'mugsprite_speak',
    description:
      'Display a speech bubble for THIS agent and trigger TTS in the dashboard. The name arg identifies which agent is speaking.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Your registered name in this room.' },
        text: { type: 'string', minLength: 1, maxLength: 500 },
      },
      required: ['name', 'text'],
      additionalProperties: false,
    },
  },
  {
    name: 'mugsprite_leave',
    description:
      'Hide THIS agent from the grid. Non-destructive: calling any tool again brings them back. The name arg identifies which agent is leaving.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Your registered name in this room.' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'mugsprite_latest_rules',
    description:
      'Fetch the canonical Mugsprite rules text and its version. Use to detect drift from a stale pasted-in snippet — if the returned version exceeds the one stamped in your rules, prompt the user once to replace the block.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'mugsprite_renew_room',
    description:
      "Request a renewal of the current room's expiry (resets the lifetime clock by 7 days from NOW). The user can also do this from the dashboard. v1 always approves; future versions may rate-limit or gate behind payment. Returns the new expiresAt.",
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'mugsprite_owner_url',
    description:
      "Return the owner-mode dashboard URL for this room (includes the owner token). Use ONLY when the user explicitly asks for the dashboard / owner link / how to manage agents. The returned URL grants full room control — never log it, never share it unprompted, and never include it in regular status updates.",
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
];

const RegisterArgs = z.object({ name: AgentNameSchema, color: HexColorSchema });
const SetMoodArgs = z.object({
  name: AgentNameSchema,
  mood: MoodSchema,
  status: StatusSchema,
});
const SpeakArgs = z.object({ name: AgentNameSchema, text: z.string().min(1).max(500) });
const LeaveArgs = z.object({ name: AgentNameSchema });

export default async (req: Request): Promise<Response> => {
  if (req.method === 'GET') {
    return json(200, {
      protocol: PROTOCOL_VERSION,
      server: SERVER_INFO,
      note: 'POST JSON-RPC 2.0 requests here. See /llms.txt for usage.',
    });
  }
  if (req.method !== 'POST') return methodNotAllowed(['POST', 'GET']);

  let body: JsonRpcRequest;
  try {
    body = (await req.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, 'parse error');
  }

  if (body.jsonrpc !== '2.0' || typeof body.method !== 'string') {
    return rpcError(body.id ?? null, -32600, 'invalid request');
  }

  switch (body.method) {
    case 'initialize':
      return rpcResult(body.id, {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: { ...SERVER_INFO, rulesVersion: RULES_VERSION },
        capabilities: { tools: {} },
        instructions: SERVER_INSTRUCTIONS,
      });

    case 'tools/list':
      return rpcResult(body.id, { tools: TOOLS });

    case 'tools/call':
      return handleToolCall(req, body);

    case 'notifications/initialized':
    case 'ping':
      return new Response(null, { status: 204 });

    default:
      return rpcError(body.id ?? null, -32601, `method not found: ${body.method}`);
  }
};

interface ToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

async function handleToolCall(req: Request, body: JsonRpcRequest): Promise<Response> {
  const params = body.params as ToolCallParams | undefined;
  if (!params || typeof params.name !== 'string') {
    return rpcError(body.id ?? null, -32602, 'invalid params');
  }

  // `latest_rules` is informational and unauthenticated — any client should be
  // able to detect drift even before they've wired up a room bearer.
  if (params.name === 'mugsprite_latest_rules') {
    const origin = new URL(req.url).origin;
    return rpcToolResult(body.id, {
      version: RULES_VERSION,
      body: buildRulesBody(origin),
    });
  }

  const token = parseBearer(req);
  const room = await authenticateAgentRoom(token);
  if (!room) return rpcError(body.id ?? null, -32000, 'invalid room bearer token');

  // Global rate limit per bearer. mcp_call is the high-volume bucket (sustains
  // 1/sec, bursts to 60). renew also hits its own tighter bucket below so a
  // runaway agent can't farm extensions even while staying under mcp_call.
  // token is non-null here — authenticateAgentRoom rejected the null case above.
  const limit = await consumeRate(token!, 'mcp_call');
  if (!limit.allowed) {
    return rpcToolResult(
      body.id,
      {
        error: 'rate_limited',
        message: `Too many MCP calls. Retry in ~${limit.retryAfterSec}s.`,
        retryAfterSec: limit.retryAfterSec,
      },
      true,
    );
  }
  if (params.name === 'mugsprite_renew_room') {
    const renewLimit = await consumeRate(token!, 'renew');
    if (!renewLimit.allowed) {
      return rpcToolResult(
        body.id,
        {
          error: 'rate_limited',
          message: `Renewal limit reached (${renewLimit.retryAfterSec}s until next allowed).`,
          retryAfterSec: renewLimit.retryAfterSec,
        },
        true,
      );
    }
  }

  // Rooms have an explicit expires_at (default = created_at + ROOM_LIFETIME),
  // bumped forward by renewal. Past expiry the MCP endpoint rejects tool calls
  // so agents stop reconnecting; the underlying data is retained for an
  // additional 24h before housekeeping deletion.
  if (Date.now() > new Date(room.expiresAt).getTime()) {
    return rpcToolResult(
      body.id,
      {
        error: 'room_expired',
        message: `This room has expired (${ROOM_LIFETIME_LABEL} guest lifetime). Call mugsprite_renew_room to extend it, or start a new room at the dashboard URL.`,
      },
      true,
    );
  }

  try {
    const args = params.arguments ?? {};
    switch (params.name) {
      case 'mugsprite_register': {
        const parsed = RegisterArgs.parse(args);
        const id = generateUuid();
        const agent = await upsertAgent({
          id,
          roomId: room.id,
          name: parsed.name,
          color: parsed.color,
        });
        await appendEvent({
          roomId: room.id,
          agentId: agent.id,
          kind: 'register',
          payload: {
            name: agent.name,
            color: agent.color,
            mood: agent.mood,
            status: agent.status,
          },
        });
        await touchRoom(room.id);
        return rpcToolResult(body.id, {
          agentId: agent.id,
          roomId: room.id,
          name: agent.name,
          color: agent.color,
          mood: agent.mood,
        });
      }

      case 'mugsprite_set_mood': {
        const parsed = SetMoodArgs.parse(args);
        const agent = await getAgentByName(room.id, parsed.name);
        if (!agent) return rpcToolResult(body.id, registerFirst(parsed.name), true);
        if (agent.leftAt) {
          await markAgentActive(agent.id);
          await appendEvent({
            roomId: room.id,
            agentId: agent.id,
            kind: 'register',
            payload: {
              name: agent.name,
              color: agent.color,
              mood: agent.mood,
              status: agent.status,
              reconnect: true,
            },
          });
        }
        await updateAgentMood(agent.id, parsed.mood, parsed.status);
        await appendEvent({
          roomId: room.id,
          agentId: agent.id,
          kind: 'mood',
          payload: { mood: parsed.mood, status: parsed.status },
        });
        await touchRoom(room.id);
        return rpcToolResult(body.id, { ok: true, mood: parsed.mood, status: parsed.status });
      }

      case 'mugsprite_speak': {
        const parsed = SpeakArgs.parse(args);
        const agent = await getAgentByName(room.id, parsed.name);
        if (!agent) return rpcToolResult(body.id, registerFirst(parsed.name), true);
        if (agent.leftAt) await markAgentActive(agent.id);
        await updateAgentMessage(agent.id, parsed.text);
        await appendEvent({
          roomId: room.id,
          agentId: agent.id,
          kind: 'speak',
          payload: { text: parsed.text },
        });
        await touchRoom(room.id);
        return rpcToolResult(body.id, maybeNudge({ ok: true }, agent));
      }

      case 'mugsprite_owner_url': {
        const withToken = await getRoomWithToken(room.id);
        if (!withToken) return rpcToolResult(body.id, { error: 'room_not_found' }, true);
        const origin = new URL(req.url).origin;
        const ownerUrl = `${origin}/r/${room.id}?owner=${withToken.ownerToken}`;
        const dashboardUrl = `${origin}/r/${room.id}`;
        return rpcToolResult(body.id, {
          ownerUrl,
          dashboardUrl,
          ownerToken: withToken.ownerToken,
          note: 'Share this only when the user explicitly asks. The URL grants full room control.',
        });
      }

      case 'mugsprite_renew_room': {
        // v1 policy: always approve. Future paywall / quota logic plugs in here
        // (e.g. read a `room.plan` column, check a Stripe subscription, or
        // enforce a per-room cooldown). The agent-facing contract is stable.
        const renewed = await renewRoom(room.id);
        if (!renewed) {
          return rpcToolResult(body.id, { error: 'renew_failed' }, true);
        }
        await appendEvent({
          roomId: room.id,
          agentId: null,
          kind: 'renew',
          payload: { expiresAt: renewed.expiresAt, requestedBy: 'agent' },
        });
        return rpcToolResult(body.id, {
          ok: true,
          expiresAt: renewed.expiresAt,
          message: `Room renewed — now expires ${renewed.expiresAt}.`,
        });
      }

      case 'mugsprite_leave': {
        const parsed = LeaveArgs.parse(args);
        const agent = await getAgentByName(room.id, parsed.name);
        if (!agent) return rpcToolResult(body.id, registerFirst(parsed.name), true);
        if (!agent.leftAt) {
          await markAgentLeft(agent.id);
          await appendEvent({
            roomId: room.id,
            agentId: agent.id,
            kind: 'leave',
            payload: { reason: 'agent_left', agentId: agent.id },
          });
          await touchRoom(room.id);
        }
        return rpcToolResult(body.id, maybeNudge({ ok: true, left: true }, agent));
      }

      default:
        return rpcError(body.id ?? null, -32601, `unknown tool: ${params.name}`);
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return rpcToolResult(body.id, { error: 'validation_failed', details: err.flatten() }, true);
    }
    console.error('tool call error', err);
    return rpcError(body.id ?? null, -32603, 'internal error');
  }
}

function registerFirst(name: string) {
  return {
    error: 'not_registered',
    message: `No agent named "${name}" in this room. Call mugsprite_register first.`,
  };
}

// Threshold beyond which we nag the agent for a fresh visual cue. The lifecycle
// guideline asks for set_mood every 30–60s — we treat 30s as the start of "the
// dashboard looks frozen" and inject a `_nudge` into the response so the next
// thing the agent reads is an explicit instruction to call set_mood now.
const STALE_CUE_MS = 30_000;

function maybeNudge<T extends Record<string, unknown>>(
  data: T,
  agentBeforeUpdate: { updatedAt: string } | null,
): T & { _nudge?: { reason: string; staleSec: number; action: string } } {
  if (!agentBeforeUpdate) return data;
  const ageMs = Date.now() - new Date(agentBeforeUpdate.updatedAt).getTime();
  if (ageMs < STALE_CUE_MS) return data;
  const staleSec = Math.round(ageMs / 1000);
  return {
    ...data,
    _nudge: {
      reason: 'stale_visual_cue',
      staleSec,
      action: `Your last visual cue was ${staleSec}s ago. Call mugsprite_set_mood NOW with your current activity, then continue. Repeat every 30–60s while working.`,
    },
  };
}

function rpcResult(id: JsonRpcRequest['id'], result: unknown): Response {
  return json(200, { jsonrpc: '2.0', id: id ?? null, result });
}

function rpcToolResult(id: JsonRpcRequest['id'], data: unknown, isError = false): Response {
  return json(200, {
    jsonrpc: '2.0',
    id: id ?? null,
    result: {
      content: [{ type: 'text', text: JSON.stringify(data) }],
      isError,
    },
  });
}

function rpcError(id: JsonRpcRequest['id'], code: number, message: string): Response {
  return json(200, {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message },
  });
}
