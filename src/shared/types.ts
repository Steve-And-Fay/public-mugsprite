import { z } from 'zod';
import { MOOD_KEYS } from './moods';

export const MoodSchema = z.enum(MOOD_KEYS);
export type Mood = z.infer<typeof MoodSchema>;

export const HexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'color must be 6-digit hex like #5599DD');

export const AgentNameSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9 _-]+$/, 'letters, numbers, space, _ or - only');

export const RoomIdSchema = z.string().regex(/^[a-z0-9-]{4,32}$/);

export interface Room {
  id: string;
  ownerToken?: string;
  // Shared bearer used by every agent in the room. Returned only to the owner.
  agentJoinToken?: string;
  name: string | null;
  createdAt: string;
  lastActiveAt: string;
  // Hard expiry boundary. Past this, MCP tool calls return room_expired and the
  // dashboard renders the expired card. Renewable via the owner panel or the
  // mugsprite_renew_room MCP tool.
  expiresAt: string;
}

export const StatusSchema = z.string().trim().min(1).max(60);

export interface Agent {
  id: string;
  roomId: string;
  name: string;
  color: string;
  mood: Mood;
  status: string | null;
  leftAt: string | null;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EventKind = 'register' | 'mood' | 'speak' | 'leave' | 'color' | 'snapshot' | 'renew';

export interface RoomEvent {
  id: number;
  roomId: string;
  agentId: string | null;
  kind: EventKind;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SnapshotPayload {
  agents: Agent[];
  lastEventId: number;
}
