import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPage from '../AdminPage';
import { UserMenuProvider } from '../../components/UserMenu';

// Mounts the admin page with a router (it reads ?token via useSearchParams)
// and the UserMenuProvider it expects from the real app shell.
function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <UserMenuProvider>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </UserMenuProvider>
    </MemoryRouter>,
  );
}

describe('AdminPage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Default to a stub so tests opting into a specific response can override.
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'unset' }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('shows a missing-token error when ?token is not present', async () => {
    renderAt('/admin');
    expect(await screen.findByText(/Missing \?token/i)).toBeInTheDocument();
    // Should never have attempted a fetch when the gate fails.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches stats when a token is supplied and renders the cards', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        generatedAt: '2026-05-21T10:00:00Z',
        traffic: {
          pageviewsToday: 12,
          pageviews7d: 80,
          pageviews30d: 420,
          uniqueVisitors7d: 31,
          uniqueVisitors30d: 110,
          topPaths: [{ path: '/', pageviews: 60 }],
          topCountries: [{ country: 'US', pageviews: 50 }],
          topReferrers: [{ referrer_host: 'news.ycombinator.com', pageviews: 22 }],
          deviceSplit: [{ device_class: 'desktop', pageviews: 70 }],
          utmCampaigns: [],
        },
        engagement: {
          concurrentLast5min: 2,
          uniqueVisitors7d: 18,
          avgDwellSecondsPerVisitor7d: 240,
          topViewedRoomsCount: 5,
        },
        product: {
          roomsCreatedToday: 1,
          roomsCreated7d: 6,
          roomsCreated30d: 19,
          agentsAdded7d: 14,
          mcpCallsByKind7d: [{ kind: 'mood', calls: 90 }],
          activeRoomsNow: 3,
        },
        sponsor: {
          clicks7d: 4,
          clicks30d: 12,
          bySponsor30d: [{ sponsor_slug: 'internetcrafters.com', clicks: 12 }],
          bySourcePath30d: [{ source_path: '/', clicks: 10 }],
        },
        trend: { pageviews: [], dwellSeconds: [], roomsCreated: [] },
      }),
    }) as unknown as typeof fetch;

    renderAt('/admin?token=local-test-token');

    expect(await screen.findByText('TRAFFIC')).toBeInTheDocument();
    expect(screen.getByText('DASHBOARD ENGAGEMENT')).toBeInTheDocument();
    expect(screen.getByText('PRODUCT ACTIVITY')).toBeInTheDocument();
    expect(screen.getByText('SPONSOR CLICKS')).toBeInTheDocument();
    // A non-trivial number from each card should be visible.
    expect(screen.getByText('420')).toBeInTheDocument(); // 30d pageviews
    expect(screen.getByText('internetcrafters.com')).toBeInTheDocument();

    // Verify the fetch went to the expected URL with the token in the query.
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]?.[0]).toContain('/api/admin/stats?token=local-test-token');
  });

  it('surfaces the server error message when the API rejects the token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'unauthorized', message: 'invalid admin token' }),
    }) as unknown as typeof fetch;

    renderAt('/admin?token=wrong');
    await waitFor(() =>
      expect(screen.getByText('invalid admin token')).toBeInTheDocument(),
    );
  });
});
