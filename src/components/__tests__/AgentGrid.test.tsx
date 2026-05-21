import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AgentGrid } from '../AgentGrid';
import type { Agent } from '@shared/types';

// The grid is what a visitor sees on a room URL. These tests cover the visible
// states the user experiences: empty (with owner vs. non-owner copy), one
// agent (centered hero), and many agents (each rendered).

function makeAgent(overrides: Partial<Agent>): Agent {
  return {
    id: 'agent-id',
    roomId: 'room-id',
    name: 'SCOUT',
    color: '#5599DD',
    mood: 'idle',
    status: null,
    leftAt: null,
    lastMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('AgentGrid', () => {
  it('shows the owner-facing empty state when no agents and isOwner=true', () => {
    render(<AgentGrid agents={[]} onSpeechEnd={() => {}} isOwner />);
    expect(
      screen.getByText(/no agents yet\. add one from the owner panel/i),
    ).toBeInTheDocument();
  });

  it('shows a visitor-friendly empty state when no agents and isOwner=false', () => {
    render(<AgentGrid agents={[]} onSpeechEnd={() => {}} isOwner={false} />);
    expect(
      screen.getByText(/no agents are in this room yet/i),
    ).toBeInTheDocument();
  });

  it('renders a single agent name in the hero layout', () => {
    render(
      <AgentGrid
        agents={[makeAgent({ name: 'SCOUT' })]}
        onSpeechEnd={() => {}}
      />,
    );
    expect(screen.getByText('SCOUT')).toBeInTheDocument();
  });

  it('renders every name when multiple agents are present', () => {
    const names = ['ALPHA', 'BETA', 'GAMMA'];
    render(
      <AgentGrid
        agents={names.map((n, i) => makeAgent({ id: `id-${i}`, name: n }))}
        onSpeechEnd={() => {}}
      />,
    );
    for (const n of names) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
  });
});
