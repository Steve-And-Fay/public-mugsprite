import { neon } from 'https://esm.sh/@netlify/neon@0.1.0';
import type { Config } from 'https://edge.netlify.com/';

// SSE stream for a single room.
// GET /api/stream/:roomId
// Lifecycle:
//   1. Validate room exists.
//   2. Send `snapshot` event: current agents + latest event id.
//   3. Every 1s, query events with id > lastSeen and emit one SSE message per row.
//   4. Send a heartbeat comment every 15s so proxies don't time out.
//   5. Tear down on client disconnect.

const POLL_INTERVAL_MS = 1000;
const HEARTBEAT_INTERVAL_MS = 15_000;

interface AgentRow {
  id: string;
  room_id: string;
  name: string;
  color: string;
  mood: string;
  status: string | null;
  last_message: string | null;
  created_at: string;
  updated_at: string;
}

interface EventRow {
  id: string;
  room_id: string;
  agent_id: string | null;
  kind: string;
  payload: unknown;
  created_at: string;
}

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const match = /\/api\/stream\/([^/]+)/.exec(url.pathname);
  if (!match) {
    return new Response(JSON.stringify({ error: 'bad_request' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  const roomId = match[1]!;

  const sql = neon();

  const rooms = (await sql`
    SELECT id FROM rooms
    WHERE id = ${roomId} AND expires_at > NOW()
    LIMIT 1
  `) as Array<{ id: string }>;
  if (rooms.length === 0) {
    return new Response('room not found or expired', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const encoder = new TextEncoder();
  let cancelled = false;
  let pollTimer: number | undefined;
  let heartbeatTimer: number | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (eventName: string, data: unknown) => {
        const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };
      const comment = (msg: string) => {
        controller.enqueue(encoder.encode(`: ${msg}\n\n`));
      };

      const agents = (await sql`
        SELECT * FROM agents
        WHERE room_id = ${roomId} AND left_at IS NULL
        ORDER BY created_at ASC
      `) as AgentRow[];
      const maxIdRows = (await sql`
        SELECT COALESCE(MAX(id), 0) AS max_id FROM events WHERE room_id = ${roomId}
      `) as Array<{ max_id: string | number }>;
      let lastEventId = Number(maxIdRows[0]?.max_id ?? 0);

      send('snapshot', {
        agents: agents.map((a) => ({
          id: a.id,
          roomId: a.room_id,
          name: a.name,
          color: a.color,
          mood: a.mood,
          status: a.status,
          lastMessage: a.last_message,
          createdAt: a.created_at,
          updatedAt: a.updated_at,
        })),
        lastEventId,
      });

      const poll = async () => {
        if (cancelled) return;
        try {
          const rows = (await sql`
            SELECT * FROM events
            WHERE room_id = ${roomId} AND id > ${lastEventId}
            ORDER BY id ASC
            LIMIT 100
          `) as EventRow[];
          for (const row of rows) {
            const eventId = Number(row.id);
            controller.enqueue(
              encoder.encode(
                `id: ${eventId}\nevent: ${row.kind}\ndata: ${JSON.stringify({
                  id: eventId,
                  agentId: row.agent_id,
                  payload: row.payload,
                  createdAt: row.created_at,
                })}\n\n`,
              ),
            );
            lastEventId = eventId;
          }
        } catch (err) {
          console.error('stream poll error', err);
        }
        if (!cancelled) {
          pollTimer = setTimeout(poll, POLL_INTERVAL_MS) as unknown as number;
        }
      };

      const heartbeat = () => {
        if (cancelled) return;
        comment('hb');
        heartbeatTimer = setTimeout(heartbeat, HEARTBEAT_INTERVAL_MS) as unknown as number;
      };

      pollTimer = setTimeout(poll, POLL_INTERVAL_MS) as unknown as number;
      heartbeatTimer = setTimeout(heartbeat, HEARTBEAT_INTERVAL_MS) as unknown as number;

      req.signal.addEventListener('abort', () => {
        cancelled = true;
        if (pollTimer) clearTimeout(pollTimer);
        if (heartbeatTimer) clearTimeout(heartbeatTimer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (heartbeatTimer) clearTimeout(heartbeatTimer);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
};

export const config: Config = { path: '/api/stream/*' };
