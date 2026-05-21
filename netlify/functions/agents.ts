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

// `null` clears the customization; the renderer falls back to the built-in face.
const UpdateAgentBody = z.object({
  traits: AgentTraitsSchema.nullable(),
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

  const updated = await updateAgentTraits(agentId, parsed.traits);
  if (!updated) return badRequest('failed to update agent');

  await appendEvent({
    roomId: agent.roomId,
    agentId: agent.id,
    kind: 'traits',
    payload: { traits: parsed.traits },
  });
  await touchRoom(agent.roomId);

  return ok({ agent: updated });
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
