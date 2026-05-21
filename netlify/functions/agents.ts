import { z } from 'zod';
import { generateUuid } from '../../src/shared/ids';
import { AgentNameSchema, HexColorSchema } from '../../src/shared/types';
import { AgentTraitsSchema } from '../../src/shared/moods';
import { authenticateRoomOwner } from './_lib/auth';
import {
  appendEvent,
  createAgent,
  deleteAgent,
  getAgent,
  getRoomWithToken,
  touchRoom,
  updateAgentColor,
  updateAgentTraits,
} from './_lib/db';
import {
  badRequest,
  created,
  forbidden,
  methodNotAllowed,
  noContent,
  notFound,
  ok,
  parseBearer,
  readJson,
  serverError,
} from './_lib/http';

const CreateAgentBody = z.object({
  roomId: z.string().min(1),
  name: AgentNameSchema,
  color: HexColorSchema,
});

// `null` traits clears the customization; the renderer falls back to the
// built-in face. Color is optional so callers can update either field
// independently — at least one must be present.
const UpdateAgentBody = z
  .object({
    traits: AgentTraitsSchema.nullable().optional(),
    color: HexColorSchema.optional(),
  })
  .refine((v) => v.traits !== undefined || v.color !== undefined, {
    message: 'at least one of traits or color must be provided',
  });

export default async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/(?:\.netlify\/functions|api)\/agents\/?/, '');
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
      if (req.method === 'POST') return handleCreate(req);
      return methodNotAllowed(['POST']);
    }

    if (segments.length === 1) {
      const agentId = segments[0]!;
      if (req.method === 'DELETE') return handleDelete(agentId, req);
      if (req.method === 'GET') return handleGet(agentId, req);
      if (req.method === 'PATCH') return handlePatch(agentId, req);
      return methodNotAllowed(['GET', 'PATCH', 'DELETE']);
    }

    return notFound();
  } catch (err) {
    console.error('agents handler error', err);
    return serverError();
  }
};

// Owner pre-creates / reserves an agent name+color combo. No per-agent token —
// the agent registers itself at runtime using the room's shared bearer.
async function handleCreate(req: Request): Promise<Response> {
  const parsed = await readJson(req, CreateAgentBody);
  if (parsed instanceof Response) return parsed;

  const ownerToken = parseBearer(req);
  const room = await authenticateRoomOwner(parsed.roomId, ownerToken);
  if (!room) return forbidden('owner token required');

  const id = generateUuid();
  const agent = await createAgent({
    id,
    roomId: parsed.roomId,
    name: parsed.name,
    color: parsed.color,
  });

  await appendEvent({
    roomId: parsed.roomId,
    agentId: id,
    kind: 'register',
    payload: { name: agent.name, color: agent.color, mood: agent.mood },
  });
  await touchRoom(parsed.roomId);

  return created({ agent });
}

// Owner-only view of an agent. Returns the agent record plus the ROOM-level
// agent_join_token so the install snippet can be displayed.
async function handleGet(agentId: string, req: Request): Promise<Response> {
  const agent = await getAgent(agentId);
  if (!agent) return notFound('agent not found');

  const ownerToken = parseBearer(req);
  const room = await authenticateRoomOwner(agent.roomId, ownerToken);
  if (!room) return forbidden('owner token required');

  const roomWithToken = await getRoomWithToken(agent.roomId);
  return ok({
    agent,
    agentJoinToken: roomWithToken?.agentJoinToken ?? '',
  });
}

async function handlePatch(agentId: string, req: Request): Promise<Response> {
  const agent = await getAgent(agentId);
  if (!agent) return notFound('agent not found');

  const ownerToken = parseBearer(req);
  const room = await authenticateRoomOwner(agent.roomId, ownerToken);
  if (!room) return forbidden('owner token required');

  const parsed = await readJson(req, UpdateAgentBody);
  if (parsed instanceof Response) return parsed;

  // Apply each field independently and emit a discrete event per change so
  // SSE consumers can react to them with the existing single-purpose reducers
  // (color update + traits update) rather than a combined "agent.updated".
  let latest = agent;

  if (parsed.color !== undefined && parsed.color !== latest.color) {
    await updateAgentColor(agentId, parsed.color);
    await appendEvent({
      roomId: latest.roomId,
      agentId: latest.id,
      kind: 'color',
      payload: { color: parsed.color },
    });
    latest = { ...latest, color: parsed.color };
  }

  if (parsed.traits !== undefined) {
    const updated = await updateAgentTraits(agentId, parsed.traits);
    if (!updated) return badRequest('failed to update agent traits');
    await appendEvent({
      roomId: latest.roomId,
      agentId: latest.id,
      kind: 'traits',
      payload: { traits: parsed.traits },
    });
    latest = updated;
  }

  await touchRoom(latest.roomId);
  return ok({ agent: latest });
}

async function handleDelete(agentId: string, req: Request): Promise<Response> {
  const agent = await getAgent(agentId);
  if (!agent) return notFound('agent not found');

  const ownerToken = parseBearer(req);
  const room = await authenticateRoomOwner(agent.roomId, ownerToken);
  if (!room) return forbidden('owner token required');

  await appendEvent({
    roomId: agent.roomId,
    agentId: agent.id,
    kind: 'leave',
    payload: { reason: 'owner_removed', agentId: agent.id },
  });
  await deleteAgent(agentId);
  await touchRoom(agent.roomId);

  return noContent();
}
