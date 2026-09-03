import { test, expect } from '@playwright/test';
import { mockTauriInvoke } from './helpers/mock-tauri.js';

test.describe('JSON HTML UI', () => {
  test.beforeEach(async ({ page }) => {
    await mockTauriInvoke(page);
    await page.goto('/');
  });

  test('navigates to JSON HTML tab and interacts', async ({ page }) => {
    const tab = page.locator('#jsonHtmlTabBtn');
    await tab.click();
    await expect(tab).toHaveClass(/active/);
  });
});
