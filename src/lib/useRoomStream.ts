import { useEffect, useReducer, useRef } from 'react';
import type { Agent, Mood } from '@shared/types';
import type { AgentTraits } from '@shared/moods';

interface State {
  agents: Record<string, Agent & { speakingText?: string | null; speakingNonce?: number }>;
  status: 'connecting' | 'open' | 'error' | 'closed';
  lastEventId: number;
}

type Action =
  | { type: 'snapshot'; agents: Agent[]; lastEventId: number }
  | { type: 'open' }
  | { type: 'error' }
  | { type: 'register'; eventId: number; agent: Agent }
  | { type: 'mood'; eventId: number; agentId: string; mood: Mood; status: string | null }
  | { type: 'speak'; eventId: number; agentId: string; text: string }
  | { type: 'color'; eventId: number; agentId: string; color: string }
  | { type: 'leave'; eventId: number; agentId: string }
  | { type: 'traits'; eventId: number; agentId: string; traits: AgentTraits | null }
  | { type: 'speech-end'; agentId: string };

const initial: State = { agents: {}, status: 'connecting', lastEventId: 0 };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'snapshot': {
      const next: State['agents'] = {};
      for (const a of action.agents) next[a.id] = { ...a };
      return { ...state, agents: next, lastEventId: action.lastEventId, status: 'open' };
    }
    case 'open':
      return { ...state, status: 'open' };
    case 'error':
      return { ...state, status: 'error' };
    case 'register': {
      const existing = state.agents[action.agent.id];
      return {
        ...state,
        lastEventId: action.eventId,
        agents: { ...state.agents, [action.agent.id]: { ...existing, ...action.agent } },
      };
    }
    case 'mood': {
      const existing = state.agents[action.agentId];
      if (!existing) return state;
      return {
        ...state,
        lastEventId: action.eventId,
        agents: {
          ...state.agents,
          [action.agentId]: {
            ...existing,
            mood: action.mood,
            status: action.status ?? existing.status,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }
    case 'speak': {
      const existing = state.agents[action.agentId];
      if (!existing) return state;
      return {
        ...state,
        lastEventId: action.eventId,
        agents: {
          ...state.agents,
          [action.agentId]: {
            ...existing,
            lastMessage: action.text,
            speakingText: action.text,
            speakingNonce: (existing.speakingNonce ?? 0) + 1,
          },
        },
      };
    }
    case 'color': {
      const existing = state.agents[action.agentId];
      if (!existing) return state;
      return {
        ...state,
        lastEventId: action.eventId,
        agents: {
          ...state.agents,
          [action.agentId]: { ...existing, color: action.color },
        },
      };
    }
    case 'traits': {
      const existing = state.agents[action.agentId];
      if (!existing) return state;
      return {
        ...state,
        lastEventId: action.eventId,
        agents: {
          ...state.agents,
          [action.agentId]: { ...existing, traits: action.traits },
        },
      };
    }
    case 'leave': {
      if (!state.agents[action.agentId]) return state;
      const { [action.agentId]: _drop, ...rest } = state.agents;
      void _drop;
      return { ...state, lastEventId: action.eventId, agents: rest };
    }
    case 'speech-end': {
      const existing = state.agents[action.agentId];
      if (!existing) return state;
      return {
        ...state,
        agents: { ...state.agents, [action.agentId]: { ...existing, speakingText: null } },
      };
    }
    default:
      return state;
  }
}

export function useRoomStream(roomId: string | undefined) {
  const [state, dispatch] = useReducer(reducer, initial);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const es = new EventSource(`/api/stream/${encodeURIComponent(roomId)}`);
    esRef.current = es;

    es.addEventListener('open', () => dispatch({ type: 'open' }));
    es.addEventListener('error', () => dispatch({ type: 'error' }));

    es.addEventListener('snapshot', (e) => {
      const data = JSON.parse((e as MessageEvent).data) as {
        agents: Agent[];
        lastEventId: number;
      };
      dispatch({ type: 'snapshot', agents: data.agents, lastEventId: data.lastEventId });
    });

    es.addEventListener('register', (e) => {
      const msg = JSON.parse((e as MessageEvent).data) as {
        id: number;
        agentId: string;
        payload: {
          name: string;
          color: string;
          mood: Mood;
          status?: string | null;
          reconnect?: boolean;
          traits?: AgentTraits | null;
        };
      };
      const now = new Date().toISOString();
      const agent: Agent = {
        id: msg.agentId,
        roomId,
        name: msg.payload.name,
        color: msg.payload.color,
        mood: msg.payload.mood,
        status: msg.payload.status ?? null,
        leftAt: null,
        lastMessage: null,
        createdAt: now,
        updatedAt: now,
        traits: msg.payload.traits ?? null,
      };
      dispatch({ type: 'register', eventId: msg.id, agent });
    });

    es.addEventListener('mood', (e) => {
      const msg = JSON.parse((e as MessageEvent).data) as {
        id: number;
        agentId: string;
        payload: { mood: Mood; status?: string | null };
      };
      dispatch({
        type: 'mood',
        eventId: msg.id,
        agentId: msg.agentId,
        mood: msg.payload.mood,
        status: msg.payload.status ?? null,
      });
    });

    es.addEventListener('speak', (e) => {
      const msg = JSON.parse((e as MessageEvent).data) as {
        id: number;
        agentId: string;
        payload: { text: string };
      };
      dispatch({ type: 'speak', eventId: msg.id, agentId: msg.agentId, text: msg.payload.text });
    });

    es.addEventListener('color', (e) => {
      const msg = JSON.parse((e as MessageEvent).data) as {
        id: number;
        agentId: string;
        payload: { color: string };
      };
      dispatch({
        type: 'color',
        eventId: msg.id,
        agentId: msg.agentId,
        color: msg.payload.color,
      });
    });

    es.addEventListener('traits', (e) => {
      const msg = JSON.parse((e as MessageEvent).data) as {
        id: number;
        agentId: string;
        payload: { traits: AgentTraits | null };
      };
      dispatch({
        type: 'traits',
        eventId: msg.id,
        agentId: msg.agentId,
        traits: msg.payload.traits,
      });
    });

    es.addEventListener('leave', (e) => {
      const msg = JSON.parse((e as MessageEvent).data) as {
        id: number;
        agentId: string | null;
        payload?: { agentId?: string };
      };
      const agentId = msg.agentId ?? msg.payload?.agentId;
      if (!agentId) return;
      dispatch({ type: 'leave', eventId: msg.id, agentId });
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [roomId]);

  const acknowledgeSpeech = (agentId: string) => dispatch({ type: 'speech-end', agentId });

  return { state, acknowledgeSpeech };
}
