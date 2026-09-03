import { test, expect } from '@playwright/test';
import { mockTauriInvoke } from './helpers/mock-tauri.js';

test.describe('Image Resizer UI', () => {
  test.beforeEach(async ({ page }) => {
    await mockTauriInvoke(page);
    await page.goto('/');
  });

  test('navigates to Image Resizer tab and interacts', async ({ page }) => {
    const tab = page.locator('#imageResizerTabBtn');
    await tab.click();
    await expect(tab).toHaveClass(/active/);
  });
});
