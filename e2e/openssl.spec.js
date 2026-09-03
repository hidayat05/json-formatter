import { test, expect } from '@playwright/test';
import { mockTauriInvoke } from './helpers/mock-tauri.js';

test.describe('OpenSSL UI', () => {
  test.beforeEach(async ({ page }) => {
    await mockTauriInvoke(page);
    await page.goto('/');
  });

  test('navigates to OpenSSL tab and interacts', async ({ page }) => {
    const tab = page.locator('#opensslTabBtn');
    await tab.click();
    await expect(tab).toHaveClass(/active/);
  });
});
