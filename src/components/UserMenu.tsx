import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { UserMenuContext, type UserMenuItem } from './UserMenuContext';

// Shared "logged-in user" menu: a hamburger button in the top chrome that
// opens a dropdown of page-specific actions. Pages register their items via
// the useUserMenu hook (in lib/useUserMenu); if no page sets items, the
// hamburger doesn't render.
//
// Used today by /admin. The room owner page intentionally leaves it empty for
// now (see RoomPage); future room-owner actions (change sprite, rename room,
// rotate agent join token, etc.) plug in via the same hook.

export function UserMenuProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<UserMenuItem[] | null>(null);
  return (
    <UserMenuContext.Provider value={{ items, setItems }}>{children}</UserMenuContext.Provider>
  );
}

// Rendered by Layout in the top chrome. Null when no page has registered items.
export function UserMenuHamburger() {
  const { items } = useContext(UserMenuContext);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!items || items.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="border-[2px] border-ink rounded-md bg-paper px-2 py-1 font-display text-[10px] tracking-widest hover:bg-ink hover:text-paper transition-colors"
      >
        ☰ MENU
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 min-w-[200px] border-[3px] border-ink rounded-md bg-paper shadow-brutal text-sm z-50"
        >
          {items.map((item) => {
            const classes = [
              'block w-full text-left px-3 py-2 hover:bg-ink hover:text-paper transition-colors',
              item.variant === 'danger' ? 'text-red-700 hover:bg-red-700 hover:text-paper' : '',
            ]
              .filter(Boolean)
              .join(' ');
            if (item.href) {
              return (
                <a
                  key={item.label}
                  role="menuitem"
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  className={classes}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              );
            }
            return (
              <button
                key={item.label}
                role="menuitem"
                type="button"
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className={classes}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
