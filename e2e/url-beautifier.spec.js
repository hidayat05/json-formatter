import { test, expect } from '@playwright/test';
import { mockTauriInvoke } from './helpers/mock-tauri.js';

test.describe('URL Beautifier UI', () => {
  test.beforeEach(async ({ page }) => {
    await mockTauriInvoke(page);
    await page.goto('/');
  });

  test('navigates to URL Beautifier tab and interacts', async ({ page }) => {
    const tab = page.locator('#urlTabBtn');
    await tab.click();
    await expect(tab).toHaveClass(/active/);
  });
});
