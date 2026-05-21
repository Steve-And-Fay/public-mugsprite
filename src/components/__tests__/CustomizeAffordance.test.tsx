import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentGrid } from '../AgentGrid';
import type { Agent } from '@shared/types';

// The Customize affordance is meant to be self-discoverable for owners and
// invisible to non-owners. These tests pin down the contract:
//  1. Non-owners never see it, regardless of traits.
//  2. Owners with an uncustomized agent see an always-visible CUSTOMIZE badge.
//  3. Once an agent is customized, the badge goes away (button is hover-only).
//  4. Clicking the button calls onCustomize with the right agent id.

function makeAgent(overrides: Partial<Agent>): Agent {
  return {
    id: 'agent-1',
    roomId: 'room-id',
    name: 'SCOUT',
    color: '#5599DD',
    mood: 'idle',
    status: null,
    leftAt: null,
    lastMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    traits: null,
    ...overrides,
  };
}

beforeEach(() => {
  // localStorage hint dismissal is per-agent; clear between runs so the
  // "first-time hint shows" assertion isn't poisoned by previous tests.
  try {
    window.localStorage.clear();
  } catch {
    /* environment lacks localStorage — irrelevant for these tests */
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Customize affordance on agent tiles', () => {
  it('does not render any Customize button for non-owner viewers', () => {
    render(
      <AgentGrid
        agents={[makeAgent({})]}
        onSpeechEnd={() => {}}
        isOwner={false}
        onCustomize={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: /customize/i })).not.toBeInTheDocument();
  });

  it('shows a discoverable CUSTOMIZE badge for owners on uncustomized agents', () => {
    render(
      <AgentGrid
        agents={[makeAgent({ traits: null })]}
        onSpeechEnd={() => {}}
        isOwner
        onCustomize={() => {}}
      />,
    );
    const btn = screen.getByRole('button', { name: /customize scout's appearance/i });
    // The badge variant carries the CUSTOMIZE label so an owner spots the
    // feature without needing to hover.
    expect(btn).toHaveTextContent(/customize/i);
  });

  it('reverts to hover-only (no hint label) once the agent has been customized', () => {
    render(
      <AgentGrid
        agents={[
          makeAgent({ traits: { v: 2, eyesFamily: 'pixel', mouthFamily: 'pixel' } }),
        ]}
        onSpeechEnd={() => {}}
        isOwner
        onCustomize={() => {}}
      />,
    );
    const btn = screen.getByRole('button', { name: /customize scout's appearance/i });
    // Hover-mode button is labeled EDIT, not CUSTOMIZE — the visible hint has
    // been retired now that the agent has explicit traits.
    expect(btn).toHaveTextContent(/edit/i);
    expect(btn).not.toHaveTextContent(/customize$/i);
  });

  it('calls onCustomize with the agent id when clicked', async () => {
    const onCustomize = vi.fn();
    const user = userEvent.setup();
    render(
      <AgentGrid
        agents={[makeAgent({ id: 'scout-id' })]}
        onSpeechEnd={() => {}}
        isOwner
        onCustomize={onCustomize}
      />,
    );
    await user.click(screen.getByRole('button', { name: /customize scout's appearance/i }));
    expect(onCustomize).toHaveBeenCalledWith('scout-id');
  });

  it('persists hint dismissal in localStorage when the button is clicked', async () => {
    const onCustomize = vi.fn();
    const user = userEvent.setup();
    const { unmount } = render(
      <AgentGrid
        agents={[makeAgent({ id: 'scout-id' })]}
        onSpeechEnd={() => {}}
        isOwner
        onCustomize={onCustomize}
      />,
    );

    // First render: badge is visible (CUSTOMIZE label).
    expect(screen.getByRole('button', { name: /customize/i })).toHaveTextContent(/customize/i);
    await user.click(screen.getByRole('button', { name: /customize/i }));
    unmount();

    // Second render — same agent, still null traits. The hint must NOT come
    // back because clicking already dismissed it for this agent.
    render(
      <AgentGrid
        agents={[makeAgent({ id: 'scout-id' })]}
        onSpeechEnd={() => {}}
        isOwner
        onCustomize={onCustomize}
      />,
    );
    expect(screen.getByRole('button', { name: /customize/i })).toHaveTextContent(/edit/i);
  });
});
