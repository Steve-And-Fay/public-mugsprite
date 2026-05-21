import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserMenuHamburger, UserMenuProvider } from '../UserMenu';
import { useUserMenu } from '../../lib/useUserMenu';
import type { UserMenuItem } from '../UserMenuContext';

// Tiny page-shaped fixture: a host component registers items via the hook, then
// renders the hamburger inside the same provider. Mirrors how real pages wire
// it up (AdminPage registers, Layout/BetaBanner renders the hamburger).
function Harness({ items }: { items: UserMenuItem[] | null }) {
  return (
    <UserMenuProvider>
      <UserMenuRegistrar items={items} />
      <UserMenuHamburger />
    </UserMenuProvider>
  );
}

function UserMenuRegistrar({ items }: { items: UserMenuItem[] | null }) {
  useUserMenu(items);
  return null;
}

describe('UserMenu', () => {
  it('does not render the button when no items are registered', () => {
    render(<Harness items={null} />);
    expect(screen.queryByRole('button', { name: /menu/i })).not.toBeInTheDocument();
  });

  it('does not render when registered with an empty array', () => {
    render(<Harness items={[]} />);
    expect(screen.queryByRole('button', { name: /menu/i })).not.toBeInTheDocument();
  });

  it('shows the hamburger when items are registered', async () => {
    render(<Harness items={[{ label: 'Refresh' }]} />);
    // Hook fires in an effect, so the button appears after the first paint.
    expect(await screen.findByRole('button', { name: /menu/i })).toBeInTheDocument();
  });

  it('opens on click, lists items, and fires the onClick handler', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(
      <Harness
        items={[
          { label: 'Refresh', onClick: handle },
          { label: 'Sign out', variant: 'danger', onClick: vi.fn() },
        ]}
      />,
    );

    const button = await screen.findByRole('button', { name: /menu/i });
    await user.click(button);

    // The menu items should now be visible.
    const refresh = screen.getByRole('menuitem', { name: 'Refresh' });
    const signOut = screen.getByRole('menuitem', { name: 'Sign out' });
    expect(refresh).toBeInTheDocument();
    expect(signOut).toBeInTheDocument();

    await user.click(refresh);
    expect(handle).toHaveBeenCalledTimes(1);

    // Menu closes after picking an item.
    expect(screen.queryByRole('menuitem', { name: 'Refresh' })).not.toBeInTheDocument();
  });

  it('renders link items with href instead of a button handler', async () => {
    const user = userEvent.setup();
    render(<Harness items={[{ label: 'Docs', href: '/faq' }]} />);
    await user.click(await screen.findByRole('button', { name: /menu/i }));
    const link = screen.getByRole('menuitem', { name: 'Docs' });
    expect(link).toHaveAttribute('href', '/faq');
  });

  it('closes when Escape is pressed', async () => {
    const user = userEvent.setup();
    render(<Harness items={[{ label: 'Refresh', onClick: vi.fn() }]} />);
    await user.click(await screen.findByRole('button', { name: /menu/i }));
    expect(screen.getByRole('menuitem', { name: 'Refresh' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menuitem', { name: 'Refresh' })).not.toBeInTheDocument();
  });
});
