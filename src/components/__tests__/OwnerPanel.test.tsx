import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OwnerPanel } from '../OwnerPanel';
import { api } from '../../lib/api';
import type { Agent } from '@shared/types';

vi.mock('../../lib/api', () => ({
  api: {
    createAgent: vi.fn(),
    deleteAgent: vi.fn(),
    renewRoom: vi.fn(),
  },
}));

const createAgentMock = api.createAgent as unknown as ReturnType<typeof vi.fn>;

function sampleAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-1',
    roomId: 'room-abc',
    name: 'SCOUT',
    color: '#5599DD',
    mood: 'idle',
    status: null,
    leftAt: null,
    lastMessage: null,
    createdAt: '2026-05-21T00:00:00Z',
    updatedAt: '2026-05-21T00:00:00Z',
    traits: null,
    ...overrides,
  };
}

function renderOwnerPanel(agents: Agent[] = []) {
  return render(
    <OwnerPanel
      roomId="room-abc"
      ownerToken="owner-token"
      agentJoinToken="join-token"
      agents={agents}
      origin="https://mugsprite.com"
      expiresAt={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}
      onRenewed={() => {}}
    />,
  );
}

describe('OwnerPanel — owner journey: add an agent', () => {
  beforeEach(() => {
    createAgentMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the add-agent form with a pre-filled name and color swatches', () => {
    renderOwnerPanel();
    const nameInput = screen.getByPlaceholderText(/Agent name/i) as HTMLInputElement;
    expect(nameInput.value.length).toBeGreaterThan(0);
    // 8 color swatches in DEFAULT_COLORS.
    expect(screen.getAllByLabelText(/^Color #/i).length).toBe(8);
    expect(screen.getByRole('button', { name: /add agent/i })).toBeEnabled();
  });

  it('submits a new agent and surfaces the install snippet on success', async () => {
    const user = userEvent.setup();
    const newAgent = sampleAgent({ id: 'agent-new', name: 'ZIPPY' });
    createAgentMock.mockResolvedValueOnce({ agent: newAgent });

    renderOwnerPanel();

    const nameInput = screen.getByPlaceholderText(/Agent name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'ZIPPY');
    await user.click(screen.getByRole('button', { name: /add agent/i }));

    expect(createAgentMock).toHaveBeenCalledWith(
      'room-abc',
      'ZIPPY',
      expect.stringMatching(/^#[0-9A-Fa-f]{6}$/),
      'owner-token',
    );

    // The install snippet panel appears (carries the join token).
    await waitFor(() => {
      expect(screen.getByText(/install snippet|drop into your agent/i)).toBeInTheDocument();
    });
  });

  it('keeps you on the form and shows the error when the API rejects', async () => {
    const user = userEvent.setup();
    createAgentMock.mockRejectedValueOnce(new Error('duplicate agent name'));

    renderOwnerPanel();
    await user.click(screen.getByRole('button', { name: /add agent/i }));

    expect(await screen.findByText('duplicate agent name')).toBeInTheDocument();
    // No install snippet on failure.
    expect(screen.queryByText(/install snippet|drop into your agent/i)).not.toBeInTheDocument();
  });

  it('blocks submission with a whitespace-only name', async () => {
    const user = userEvent.setup();
    renderOwnerPanel();

    const nameInput = screen.getByPlaceholderText(/Agent name/i);
    await user.clear(nameInput);
    // user-event does not normalize a single space into "empty" — the button
    // disables on the trimmed-empty value via the `!name.trim()` check.
    await user.type(nameInput, '   ');

    expect(screen.getByRole('button', { name: /add agent/i })).toBeDisabled();
    expect(createAgentMock).not.toHaveBeenCalled();
  });

  it('lists existing agents with the active-agents count', () => {
    renderOwnerPanel([sampleAgent({ name: 'ALPHA' }), sampleAgent({ id: 'a2', name: 'BETA' })]);
    expect(screen.getByText(/Active agents \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText('ALPHA')).toBeInTheDocument();
    expect(screen.getByText('BETA')).toBeInTheDocument();
  });
});
