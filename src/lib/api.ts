import type { Agent, Room } from '@shared/types';
import type { AgentTraits } from '@shared/moods';

export interface CreateRoomResponse {
  room: Pick<Room, 'id' | 'name' | 'createdAt'>;
  ownerToken: string;
  dashboardUrl: string;
}

export interface GetRoomResponse {
  room: Room;
  isOwner: boolean;
}

export interface CreateAgentResponse {
  agent: Agent;
}

export interface AgentInstallResponse {
  agent: Agent;
  agentJoinToken: string;
}

class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { ownerToken?: string } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (init.ownerToken) headers.set('authorization', `Bearer ${init.ownerToken}`);

  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  // Tolerate non-JSON responses (e.g. function crashed before reaching the
  // json() helper and Netlify returned a plain-text 500 with a stack trace).
  // Surfacing the raw text in the error is more useful than a parse error.
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : body && typeof body === 'object' && 'raw' in body
          ? truncate(String((body as { raw: unknown }).raw), 240)
          : `HTTP ${res.status}`;
    throw new ApiError(res.status, message, body);
  }
  return body as T;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export const api = {
  createRoom: (name?: string) =>
    request<CreateRoomResponse>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  getRoom: (roomId: string, ownerToken?: string) =>
    request<GetRoomResponse>(
      `/api/rooms/${encodeURIComponent(roomId)}${ownerToken ? `?owner=${encodeURIComponent(ownerToken)}` : ''}`,
    ),

  listAgents: (roomId: string) =>
    request<{ agents: Agent[] }>(`/api/rooms/${encodeURIComponent(roomId)}/agents`),

  createAgent: (roomId: string, name: string, color: string, ownerToken: string) =>
    request<CreateAgentResponse>('/api/agents', {
      method: 'POST',
      ownerToken,
      body: JSON.stringify({ roomId, name, color }),
    }),

  getAgentInstall: (agentId: string, ownerToken: string) =>
    request<AgentInstallResponse>(`/api/agents/${encodeURIComponent(agentId)}`, {
      method: 'GET',
      ownerToken,
    }),

  deleteAgent: (agentId: string, ownerToken: string) =>
    request<null>(`/api/agents/${encodeURIComponent(agentId)}`, {
      method: 'DELETE',
      ownerToken,
    }),

  // Pass `null` traits to clear the customization — the renderer falls back
  // to the built-in face. Pass color to update the personality color. Either
  // (or both) may be present; at least one must be.
  updateAgent: (
    agentId: string,
    patch: { traits?: AgentTraits | null; color?: string },
    ownerToken: string,
  ) =>
    request<{ agent: Agent }>(`/api/agents/${encodeURIComponent(agentId)}`, {
      method: 'PATCH',
      ownerToken,
      body: JSON.stringify(patch),
    }),

  // Convenience wrapper kept for backward compat with existing call sites.
  updateAgentTraits: (
    agentId: string,
    traits: AgentTraits | null,
    ownerToken: string,
  ) =>
    request<{ agent: Agent }>(`/api/agents/${encodeURIComponent(agentId)}`, {
      method: 'PATCH',
      ownerToken,
      body: JSON.stringify({ traits }),
    }),

  deleteRoom: (roomId: string, ownerToken: string) =>
    request<{ ok: true; deletedRoomId: string }>(
      `/api/rooms/${encodeURIComponent(roomId)}`,
      { method: 'DELETE', ownerToken },
    ),

  renewRoom: (roomId: string, ownerToken: string) =>
    request<{ ok: true; expiresAt: string }>(
      `/api/rooms/${encodeURIComponent(roomId)}/renew`,
      { method: 'POST', ownerToken },
    ),

  // Pass `name: null` (or an empty string — the server normalizes) to clear
  // a previously-set display name and fall back to showing the room id.
  renameRoom: (roomId: string, name: string | null, ownerToken: string) =>
    request<{ ok: true; room: Room }>(
      `/api/rooms/${encodeURIComponent(roomId)}`,
      { method: 'PATCH', ownerToken, body: JSON.stringify({ name }) },
    ),

  // Returns the raw Response so callers can stream the file to disk.
  exportRoomUrl: (roomId: string, ownerToken: string) =>
    `/api/rooms/${encodeURIComponent(roomId)}/export?owner=${encodeURIComponent(ownerToken)}`,
};

export { ApiError };
