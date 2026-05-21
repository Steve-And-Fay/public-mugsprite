import { useContext, useEffect, useRef } from 'react';
import { UserMenuContext, type UserMenuItem } from '../components/UserMenuContext';

// Page-side hook to register hamburger menu items. The matching context lives
// in components/UserMenuContext so this file stays Fast-Refresh friendly and
// components/UserMenu.tsx only exports components.
export function useUserMenu(items: UserMenuItem[] | null): void {
  const { setItems } = useContext(UserMenuContext);
  // Ref so a fresh items-array each render doesn't churn the effect; effect
  // body always reads the latest snapshot via the ref.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => {
    setItems(itemsRef.current);
    return () => setItems(null);
  }, [setItems]);
}
