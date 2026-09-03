import { test, expect } from '@playwright/test';
import { mockTauriInvoke } from './helpers/mock-tauri.js';

test.describe('Mermaid UI', () => {
  test.beforeEach(async ({ page }) => {
    await mockTauriInvoke(page);
    await page.goto('/');
  });

  test('navigates to Mermaid tab and interacts', async ({ page }) => {
    const tab = page.locator('#mermaidTabBtn');
    await tab.click();
    await expect(tab).toHaveClass(/active/);
  });
});
