import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '../LandingPage';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    createRoom: vi.fn(),
  },
}));

// Render the landing page inside the minimum providers it needs: router (for
// useNavigate / Link) and Helmet (for the <Helmet> tag). Includes a stub
// /r/:roomId route so navigation lands somewhere we can assert on.
function renderLanding() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/r/:roomId" element={<div>ROOM PAGE STUB</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const createRoomMock = api.createRoom as unknown as ReturnType<typeof vi.fn>;

describe('LandingPage', () => {
  beforeEach(() => {
    createRoomMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the headline and the primary CTA', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: 'MUGSPRITE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create a room/i })).toBeInTheDocument();
  });

  it('blocks room creation until the terms checkbox is checked', async () => {
    const user = userEvent.setup();
    renderLanding();
    const btn = screen.getByRole('button', { name: /create a room/i });
    // Disabled because the agree-to-terms checkbox is not yet checked.
    expect(btn).toBeDisabled();
    expect(createRoomMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('checkbox'));
    expect(btn).toBeEnabled();
  });

  it('creates a room and navigates to it on successful submit', async () => {
    const user = userEvent.setup();
    createRoomMock.mockResolvedValueOnce({
      room: { id: 'abc123', name: null, createdAt: '2026-05-21T10:00:00Z' },
      ownerToken: 'owner-xyz',
      dashboardUrl: 'https://mugsprite.com/r/abc123',
    });

    renderLanding();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /create a room/i }));

    expect(createRoomMock).toHaveBeenCalledTimes(1);
    // The stub /r/:roomId route renders this string when navigation happens.
    await waitFor(() => expect(screen.getByText('ROOM PAGE STUB')).toBeInTheDocument());
  });

  it('surfaces an API failure inline without navigating', async () => {
    const user = userEvent.setup();
    createRoomMock.mockRejectedValueOnce(new Error('rate limited'));

    renderLanding();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /create a room/i }));

    expect(await screen.findByText('rate limited')).toBeInTheDocument();
    // Still on the landing page — no navigation happened.
    expect(screen.queryByText('ROOM PAGE STUB')).not.toBeInTheDocument();
  });
});
