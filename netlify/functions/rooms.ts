import { z } from 'zod';
import { generateRoomId, generateToken } from '../../src/shared/ids';
import { authenticateRoomOwner } from './_lib/auth';
import {
  appendEvent,
  createRoom,
  deleteRoom,
  exportRoom,
  getRoom,
  getRoomWithToken,
  listAgents,
  renewRoom,
  touchRoom,
  updateRoomName,
} from './_lib/db';
import {
  created,
  methodNotAllowed,
  notFound,
  ok,
  parseBearer,
  readJson,
  serverError,
  unauthorized,
} from './_lib/http';
import { consumeRate } from './_lib/rateLimit';
import { normalizeRoomName, PatchRoomBody } from './_lib/roomName';

const CreateRoomBody = z.object({
  name: z.string().min(1).max(64).optional(),
});

export default async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/(?:\.netlify\/functions|api)\/rooms\/?/, '');

    if (path === '' || path === '/') {
      if (req.method === 'POST') return handleCreate(req);
      return methodNotAllowed(['POST']);
    }

    const segments = path.split('/').filter(Boolean);
    const roomId = segments[0]!;

    if (segments.length === 1) {
      if (req.method === 'GET') return handleGet(roomId, req);
      if (req.method === 'PATCH') return handlePatch(roomId, req);
      if (req.method === 'DELETE') return handleDelete(roomId, req);
      return methodNotAllowed(['GET', 'PATCH', 'DELETE']);
    }

    if (segments.length === 2 && segments[1] === 'agents') {
      if (req.method === 'GET') return handleListAgents(roomId, req);
      return methodNotAllowed(['GET']);
    }

    if (segments.length === 2 && segments[1] === 'export') {
      if (req.method === 'GET') return handleExport(roomId, req);
      return methodNotAllowed(['GET']);
    }

    if (segments.length === 2 && segments[1] === 'renew') {
      if (req.method === 'POST') return handleRenew(roomId, req);
      return methodNotAllowed(['POST']);
    }

    return notFound();
  } catch (err) {
    console.error('rooms handler error', err);
    return serverError();
  }
};

function clientIp(req: Request): string {
  const nf = req.headers.get('x-nf-client-connection-ip');
  if (nf) return nf;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}

async function handleCreate(req: Request): Promise<Response> {
  const ip = clientIp(req);
  const limit = await consumeRate(`ip:${ip}`, 'create_room');
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'rate_limited',
        message: `Room creation limit reached. Retry in ~${limit.retryAfterSec}s.`,
        retryAfterSec: limit.retryAfterSec,
      }),
      {
        status: 429,
        headers: {
          'content-type': 'application/json',
          'retry-after': String(limit.retryAfterSec),
        },
      },
    );
  }

  const parsed = await readJson(req, CreateRoomBody);
  if (parsed instanceof Response) return parsed;

  const ownerToken = generateToken();
  const agentJoinToken = generateToken();
  // Friendly slugs (adjective-animal-NN) have ~44M combos; retry on the rare
  // unique-violation collision rather than asking the user to retry.
  let room: Awaited<ReturnType<typeof createRoom>> | null = null;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = generateRoomId();
    try {
      room = await createRoom({
        id,
        ownerToken,
        agentJoinToken,
        name: parsed.name ?? null,
      });
      break;
    } catch (err) {
      lastErr = err;
      const code = (err as { code?: string } | null)?.code;
      if (code !== '23505') throw err; // not a collision; rethrow
    }
  }
  if (!room) throw lastErr ?? new Error('failed to allocate room id');
  return created({
    room: { id: room.id, name: room.name, createdAt: room.createdAt },
    ownerToken,
    dashboardUrl: `/r/${room.id}?owner=${ownerToken}`,
  });
}

async function handleGet(roomId: string, req: Request): Promise<Response> {
  const room = await getRoom(roomId);
  if (!room) return notFound('room not found');
  await touchRoom(roomId);

  const token = parseBearer(req) ?? new URL(req.url).searchParams.get('owner');
  const isOwner = token ? !!(await authenticateRoomOwner(roomId, token)) : false;

  // Owner gets the shared agent_join_token; everyone else gets a sanitized view.
  if (isOwner) {
    const withTokens = await getRoomWithToken(roomId);
    return ok({ room: withTokens ?? room, isOwner });
  }
  return ok({ room, isOwner });
}

async function handleListAgents(roomId: string, _req: Request): Promise<Response> {
  const room = await getRoom(roomId);
  if (!room) return notFound('room not found');
  const agents = await listAgents(roomId);
  return ok({ agents });
}

async function handleDelete(roomId: string, req: Request): Promise<Response> {
  const token = parseBearer(req) ?? new URL(req.url).searchParams.get('owner');
  if (!token) return unauthorized('owner token required');
  const room = await authenticateRoomOwner(roomId, token);
  if (!room) return unauthorized('invalid owner token');
  await deleteRoom(roomId);
  return ok({ ok: true, deletedRoomId: roomId });
}

async function handlePatch(roomId: string, req: Request): Promise<Response> {
  const token = parseBearer(req) ?? new URL(req.url).searchParams.get('owner');
  if (!token) return unauthorized('owner token required');
  const room = await authenticateRoomOwner(roomId, token);
  if (!room) return unauthorized('invalid owner token');

  const body = await readJson(req, PatchRoomBody);
  if (body instanceof Response) return body;

  const nextName = normalizeRoomName(body.name);
  const updated = await updateRoomName(roomId, nextName);
  if (!updated) return notFound('room not found');
  return ok({ ok: true, room: updated });
}

async function handleRenew(roomId: string, req: Request): Promise<Response> {
  const token = parseBearer(req) ?? new URL(req.url).searchParams.get('owner');
  if (!token) return unauthorized('owner token required');
  const room = await authenticateRoomOwner(roomId, token);
  if (!room) return unauthorized('invalid owner token');
  // Same `renew` bucket as the MCP tool path — owner button and agent tool
  // share quota per token, so neither can be used to bypass the other.
  const limit = await consumeRate(token, 'renew');
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'rate_limited',
        message: `Renewal limit reached. Retry in ~${limit.retryAfterSec}s.`,
        retryAfterSec: limit.retryAfterSec,
      }),
      {
        status: 429,
        headers: {
          'content-type': 'application/json',
          'retry-after': String(limit.retryAfterSec),
        },
      },
    );
  }
  // v1 policy: always approve once the rate gate passes. Future paywall /
  // quota / cooldown logic plugs in here (same as mcp.ts).
  const renewed = await renewRoom(roomId);
  if (!renewed) return notFound('room not found');
  await appendEvent({
    roomId,
    agentId: null,
    kind: 'renew',
    payload: { expiresAt: renewed.expiresAt, requestedBy: 'owner' },
  });
  return ok({ ok: true, expiresAt: renewed.expiresAt });
}

async function handleExport(roomId: string, req: Request): Promise<Response> {
  const token = parseBearer(req) ?? new URL(req.url).searchParams.get('owner');
  if (!token) return unauthorized('owner token required');
  const room = await authenticateRoomOwner(roomId, token);
  if (!room) return unauthorized('invalid owner token');

  const data = await exportRoom(roomId);
  if (!data) return notFound('room not found');

  const filename = `mugsprite-${roomId}-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        schemaVersion: 1,
        ...data,
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}"`,
      },
    },
  );
}
