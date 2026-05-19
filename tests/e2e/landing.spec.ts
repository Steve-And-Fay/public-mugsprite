import { test, expect } from '@playwright/test';

test('landing page renders create-room CTA', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'MUGSPRITE' })).toBeVisible();
  await expect(page.getByRole('button', { name: /create a room/i })).toBeVisible();
});
