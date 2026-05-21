import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ExpiredCard } from '../ExpiredCard';

// The expired-room view is what visitors hit on a stale link. Tiny test —
// just confirms the heading, the CTA back to landing, and the sponsor link
// are present and correctly wired so a regression in copy or routing
// shows up immediately.
describe('ExpiredCard', () => {
  it('renders the heading and both action links', () => {
    render(
      <MemoryRouter>
        <ExpiredCard />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /this room has expired/i })).toBeInTheDocument();

    const newRoom = screen.getByRole('link', { name: /start a new room/i });
    expect(newRoom).toHaveAttribute('href', '/');

    // The SponsorBadge at the bottom of the card also renders a sponsor link,
    // so there may be more than one match. We care that at least one explicit
    // "SPONSOR THIS SLOT →" link points to /sponsor.
    const sponsors = screen.getAllByRole('link', { name: /sponsor this slot/i });
    expect(sponsors.length).toBeGreaterThan(0);
    expect(sponsors.some((a) => a.getAttribute('href')?.startsWith('/sponsor'))).toBe(true);
  });
});
