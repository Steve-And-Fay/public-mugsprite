import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest setup. Registers jest-dom matchers (toBeInTheDocument, toHaveClass,
// etc.) and ensures every test starts with a clean DOM by tearing down any
// previously-rendered React tree between tests.
afterEach(() => {
  cleanup();
});
