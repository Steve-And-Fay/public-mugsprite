import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MugBuilder } from '../MugBuilder';
import { api } from '../../lib/api';
import type { Agent } from '@shared/types';

vi.mock('../../lib/api', () => ({
  api: {
    updateAgent: vi.fn(),
    updateAgentTraits: vi.fn(),
  },
}));

const updateMock = api.updateAgent as unknown as ReturnType<typeof vi.fn>;
const resetMock = api.updateAgentTraits as unknown as ReturnType<typeof vi.fn>;

function sampleAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-1',
    roomId: 'room-1',
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

beforeEach(() => {
  updateMock.mockReset();
  resetMock.mockReset();
});

afterEach(() => {
  document.body.style.overflow = '';
});

// The builder presents family pickers (not per-expression). These tests pin
// down the contract: pickers show all known families, the right family
// reaches the server on Save, Cancel sends nothing, and Reset only fires
// when the agent has traits to clear.
describe('MugBuilder', () => {
  it('renders an eye-family tile and a mouth-family tile for every known family', () => {
    render(
      <MugBuilder
        agent={sampleAgent()}
        ownerToken="t"
        onSaved={() => {}}
        onDismiss={() => {}}
      />,
    );
    // Family labels appear in the tile chip (uppercased). Each family name
    // appears at least once (some appear in both eye + mouth sections — that's
    // expected and intentional, the labels are shared).
    expect(screen.getAllByText('ROUND').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PIXEL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CURVE').length).toBeGreaterThan(0);
    // The 12-mood preview labels carry through.
    expect(screen.getAllByText('IDLE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SLEEPY').length).toBeGreaterThan(0);
  });

  it('sends the picked families to the server on Save', async () => {
    const user = userEvent.setup();
    updateMock.mockResolvedValue({
      agent: sampleAgent({ traits: { v: 2, eyesFamily: 'pixel', mouthFamily: 'pixel' } }),
    });
    const onSaved = vi.fn();
    const onDismiss = vi.fn();

    render(
      <MugBuilder
        agent={sampleAgent()}
        ownerToken="owner-token"
        onSaved={onSaved}
        onDismiss={onDismiss}
      />,
    );

    // Pick the Pixel family for both eyes and mouth — Pixel appears in both
    // sections, getAllByText returns them in DOM order (eye tile first).
    const pixelTiles = screen.getAllByText('PIXEL');
    await user.click(pixelTiles[0]!); // eye family pixel
    await user.click(pixelTiles[1]!); // mouth family pixel
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        'agent-1',
        {
          traits: { v: 2, eyesFamily: 'pixel', mouthFamily: 'pixel' },
          color: '#5599DD',
        },
        'owner-token',
      );
    });
    expect(onSaved).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });

  it('Cancel exits without calling the API', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <MugBuilder
        agent={sampleAgent()}
        ownerToken="t"
        onSaved={() => {}}
        onDismiss={onDismiss}
      />,
    );
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(updateMock).not.toHaveBeenCalled();
    expect(resetMock).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });

  it('Reset disabled when the agent has no custom traits to clear', () => {
    render(
      <MugBuilder
        agent={sampleAgent()}
        ownerToken="t"
        onSaved={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'RESET' })).toBeDisabled();
  });

  it('Reset sends null traits when the agent has been customized', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    resetMock.mockResolvedValue({ agent: sampleAgent({ traits: null }) });
    const onDismiss = vi.fn();

    render(
      <MugBuilder
        agent={sampleAgent({ traits: { v: 2, eyesFamily: 'pixel', mouthFamily: 'pixel' } })}
        ownerToken="owner"
        onSaved={() => {}}
        onDismiss={onDismiss}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'RESET' }));
    await waitFor(() => {
      expect(resetMock).toHaveBeenCalledWith('agent-1', null, 'owner');
    });
    expect(onDismiss).toHaveBeenCalled();
  });
});
