import { createContext } from 'react';

// Shared menu item shape and context. Lives apart from UserMenu.tsx so the
// component file stays Fast-Refresh friendly (component-only exports).
export interface UserMenuItem {
  label: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  variant?: 'default' | 'danger';
}

export interface UserMenuContextValue {
  setItems: (items: UserMenuItem[] | null) => void;
  items: UserMenuItem[] | null;
}

export const UserMenuContext = createContext<UserMenuContextValue>({
  setItems: () => {},
  items: null,
});
