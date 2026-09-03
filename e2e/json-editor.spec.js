import { test, expect } from '@playwright/test';
import { mockTauriInvoke } from './helpers/mock-tauri.js';

test.describe('JSON Editor UI', () => {
  test.beforeEach(async ({ page }) => {
    await mockTauriInvoke(page);
    await page.goto('/');
  });

  test('navigates to JSON Editor and interacts with autofix', async ({ page }) => {
    const tab = page.locator('#jsonEditorTabBtn');
    await tab.click();
    await expect(tab).toHaveClass(/active/);

    const autoFixBtn = page.locator('#jsonEditorAutoFixBtn');
    await expect(autoFixBtn).toBeVisible();
    await autoFixBtn.click();
  });
});
