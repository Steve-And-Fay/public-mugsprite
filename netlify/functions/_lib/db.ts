import { neon } from '@netlify/neon';
import type { Agent, Mood, Room, RoomEvent } from '../../../src/shared/types';

const sql = neon();

interface RoomRow {
  id: string;
  owner_token: string;
  agent_join_token: string;
  owner_user_id: string | null;
  name: string | null;
  created_at: string;
  last_active_at: string;
  expires_at: string;
}

interface AgentRow {
  id: string;
  room_id: string;
  name: string;
  color: string;
  mood: string;
  status: string | null;
  left_at: string | null;
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

function mapRoom(row: RoomRow, includeSecrets = false): Room {
  return {
    id: row.id,
    ownerToken: includeSecrets ? row.owner_token : undefined,
    agentJoinToken: includeSecrets ? row.agent_join_token : undefined,
    name: row.name,
    createdAt: row.created_at,
    lastActiveAt: row.last_active_at,
    expiresAt: row.expires_at,
  };
}

function mapAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    color: row.color,
    mood: row.mood as Mood,
    status: row.status,
    leftAt: row.left_at,
    lastMessage: row.last_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEvent(row: EventRow): RoomEvent {
  return {
    id: Number(row.id),
    roomId: row.room_id,
    agentId: row.agent_id,
    kind: row.kind as RoomEvent['kind'],
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
  };
}

export async function createRoom(params: {
  id: string;
  ownerToken: string;
  agentJoinToken: string;
  name?: string | null;
}): Promise<Room> {
  const rows = (await sql`
    INSERT INTO rooms (id, owner_token, agent_join_token, name)
    VALUES (${params.id}, ${params.ownerToken}, ${params.agentJoinToken}, ${params.name ?? null})
    RETURNING *
  `) as RoomRow[];
  return mapRoom(rows[0]!, true);
}


export async function getRoom(id: string): Promise<Room | null> {
  const rows = (await sql`SELECT * FROM rooms WHERE id = ${id} LIMIT 1`) as RoomRow[];
  return rows[0] ? mapRoom(rows[0]) : null;
}

export async function getRoomWithToken(id: string): Promise<(Room & { ownerToken: string; agentJoinToken: string }) | null> {
  const rows = (await sql`SELECT * FROM rooms WHERE id = ${id} LIMIT 1`) as RoomRow[];
  if (!rows[0]) return null;
  return {
    ...mapRoom(rows[0], true),
    ownerToken: rows[0].owner_token,
    agentJoinToken: rows[0].agent_join_token,
  };
}

export async function getRoomByAgentJoinToken(token: string): Promise<Room | null> {
  if (!token) return null;
  const rows = (await sql`
    SELECT * FROM rooms WHERE agent_join_token = ${token} LIMIT 1
  `) as RoomRow[];
  return rows[0] ? mapRoom(rows[0]) : null;
}

export async function touchRoom(id: string): Promise<void> {
  await sql`UPDATE rooms SET last_active_at = NOW() WHERE id = ${id}`;
}

// Renewal extends the hard expiry by a fresh ROOM_LIFETIME window from NOW.
// For v1 every caller (owner button + agent MCP tool) is auto-approved, but
// routing all renewals through this one helper means a future paywall /
// quota / cooldown layer only needs to be added here.
export async function renewRoom(id: string): Promise<Room | null> {
  const rows = (await sql`
    UPDATE rooms
    SET expires_at = NOW() + interval '7 days'
    WHERE id = ${id}
    RETURNING *
  `) as RoomRow[];
  return rows[0] ? mapRoom(rows[0]) : null;
}

export async function deleteRoom(id: string): Promise<void> {
  // agents + events cascade via FK ON DELETE CASCADE.
  await sql`DELETE FROM rooms WHERE id = ${id}`;
}

export async function exportRoom(id: string): Promise<{
  room: RoomRow & { agents: AgentRow[]; events: EventRow[] };
} | null> {
  const roomRows = (await sql`SELECT * FROM rooms WHERE id = ${id} LIMIT 1`) as RoomRow[];
  const room = roomRows[0];
  if (!room) return null;
  const agents = (await sql`
    SELECT * FROM agents WHERE room_id = ${id} ORDER BY created_at ASC
  `) as AgentRow[];
  const events = (await sql`
    SELECT * FROM events WHERE room_id = ${id} ORDER BY id ASC
  `) as EventRow[];
  return { room: { ...room, agents, events } };
}

export async function listAgents(roomId: string): Promise<Agent[]> {
  // Only "present" agents: soft-left ones are excluded from the live snapshot.
  // When they reconnect, the tool handler emits a fresh `register` event.
  const rows = (await sql`
    SELECT * FROM agents
    WHERE room_id = ${roomId} AND left_at IS NULL
    ORDER BY created_at ASC
  `) as AgentRow[];
  return rows.map(mapAgent);
}

export async function createAgent(params: {
  id: string;
  roomId: string;
  name: string;
  color: string;
}): Promise<Agent> {
  const rows = (await sql`
    INSERT INTO agents (id, room_id, name, color)
    VALUES (${params.id}, ${params.roomId}, ${params.name}, ${params.color})
    RETURNING *
  `) as AgentRow[];
  return mapAgent(rows[0]!);
}

export async function getAgentByName(roomId: string, name: string): Promise<Agent | null> {
  const rows = (await sql`
    SELECT * FROM agents WHERE room_id = ${roomId} AND name = ${name} LIMIT 1
  `) as AgentRow[];
  return rows[0] ? mapAgent(rows[0]) : null;
}

// Idempotent: insert agent if (room_id, name) is new; otherwise update color.
// Returns the resulting row.
export async function upsertAgent(params: {
  id: string;
  roomId: string;
  name: string;
  color: string;
}): Promise<Agent> {
  const rows = (await sql`
    INSERT INTO agents (id, room_id, name, color)
    VALUES (${params.id}, ${params.roomId}, ${params.name}, ${params.color})
    ON CONFLICT (room_id, name) DO UPDATE
      SET color = EXCLUDED.color, updated_at = NOW(), left_at = NULL
    RETURNING *
  `) as AgentRow[];
  return mapAgent(rows[0]!);
}

export async function getAgent(id: string): Promise<Agent | null> {
  const rows = (await sql`SELECT * FROM agents WHERE id = ${id} LIMIT 1`) as AgentRow[];
  return rows[0] ? mapAgent(rows[0]) : null;
}

export async function updateAgentMood(id: string, mood: Mood, status: string): Promise<void> {
  await sql`
    UPDATE agents SET mood = ${mood}, status = ${status}, updated_at = NOW() WHERE id = ${id}
  `;
}

export async function updateAgentStatus(id: string, status: string): Promise<void> {
  await sql`
    UPDATE agents SET status = ${status}, updated_at = NOW() WHERE id = ${id}
  `;
}

export async function updateAgentMessage(id: string, message: string): Promise<void> {
  await sql`
    UPDATE agents SET last_message = ${message}, updated_at = NOW() WHERE id = ${id}
  `;
}

export async function updateAgentColor(id: string, color: string): Promise<void> {
  await sql`
    UPDATE agents SET color = ${color}, updated_at = NOW() WHERE id = ${id}
  `;
}

export async function updateAgentName(id: string, name: string): Promise<void> {
  await sql`
    UPDATE agents SET name = ${name}, updated_at = NOW() WHERE id = ${id}
  `;
}

export async function deleteAgent(id: string): Promise<void> {
  await sql`DELETE FROM agents WHERE id = ${id}`;
}

export async function markAgentLeft(id: string): Promise<void> {
  await sql`UPDATE agents SET left_at = NOW(), updated_at = NOW() WHERE id = ${id}`;
}

export async function markAgentActive(id: string): Promise<void> {
  await sql`UPDATE agents SET left_at = NULL, updated_at = NOW() WHERE id = ${id}`;
}

export async function appendEvent(params: {
  roomId: string;
  agentId: string | null;
  kind: RoomEvent['kind'];
  payload: Record<string, unknown>;
}): Promise<RoomEvent> {
  const rows = (await sql`
    INSERT INTO events (room_id, agent_id, kind, payload)
    VALUES (${params.roomId}, ${params.agentId}, ${params.kind}, ${JSON.stringify(params.payload)}::jsonb)
    RETURNING *
  `) as EventRow[];
  return mapEvent(rows[0]!);
}

export async function getEventsSince(roomId: string, sinceId: number, limit = 100): Promise<RoomEvent[]> {
  const rows = (await sql`
    SELECT * FROM events
    WHERE room_id = ${roomId} AND id > ${sinceId}
    ORDER BY id ASC
    LIMIT ${limit}
  `) as EventRow[];
  return rows.map(mapEvent);
}

export async function getLatestEventId(roomId: string): Promise<number> {
  const rows = (await sql`
    SELECT COALESCE(MAX(id), 0) AS max_id FROM events WHERE room_id = ${roomId}
  `) as Array<{ max_id: string | number }>;
  return Number(rows[0]?.max_id ?? 0);
}
