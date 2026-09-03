import { test, expect } from '@playwright/test';
import { mockTauriInvoke } from './helpers/mock-tauri.js';

test.describe('Traceroute UI', () => {
  test.beforeEach(async ({ page }) => {
    await mockTauriInvoke(page);
    await page.goto('/');
  });

  test('navigates to Traceroute tab and interacts', async ({ page }) => {
    const tab = page.locator('#tracerouteTabBtn');
    await tab.click();
    await expect(tab).toHaveClass(/active/);
  });
});
