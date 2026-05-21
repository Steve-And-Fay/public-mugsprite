import { neon } from 'https://esm.sh/@netlify/neon@0.1.0';
import type { Config } from 'https://edge.netlify.com/';
import { classifyDevice, clientIp } from './_shared/classify.ts';
import { getTodaysSalt, hashVisitor } from './_shared/salt.ts';

// POST /api/track/ping
// Body: { roomId: string }
//
// Heartbeat fired by the dashboard every 60s while the tab is visible. Each
// row represents ~60s of attention on the specified room. Always 204.
// Bots dropped silently.

const ROOM_ID_RE = /^[a-z0-9-]{4,32}$/;

interface Body {
  roomId?: unknown;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  try {
    const body = (await req.json()) as Body;
    if (typeof body.roomId !== 'string' || !ROOM_ID_RE.test(body.roomId)) {
      return new Response(null, { status: 204 });
    }

    const ua = req.headers.get('user-agent') ?? '';
    if (classifyDevice(ua) === 'bot') {
      return new Response(null, { status: 204 });
    }

    const salt = await getTodaysSalt();
    const ip = clientIp(req.headers);
    const visitorHash = await hashVisitor(salt, ip, ua);

    const sql = neon();
    await sql`
      INSERT INTO analytics_dashboard_pings (visitor_hash, room_id)
      VALUES (${visitorHash}, ${body.roomId})
    `;
  } catch (err) {
    console.error('track-ping error', err);
  }
  return new Response(null, { status: 204 });
};

export const config: Config = { path: '/api/track/ping' };
