import type { Room } from '../../../src/shared/types';
import { getRoomByAgentJoinToken, getRoomWithToken } from './db';
import { tokensMatch } from './http';

export async function authenticateRoomOwner(
  roomId: string,
  token: string | null,
): Promise<Room | null> {
  if (!token) return null;
  const room = await getRoomWithToken(roomId);
  if (!room) return null;
  return tokensMatch(room.ownerToken, token) ? room : null;
}

// New room-scoped agent auth: the bearer identifies the room, the agent
// identifies itself by name in each tool call.
export async function authenticateAgentRoom(token: string | null): Promise<Room | null> {
  if (!token) return null;
  return getRoomByAgentJoinToken(token);
}
