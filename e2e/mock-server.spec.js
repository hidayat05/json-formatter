import { test, expect } from '@playwright/test';
import { mockTauriInvoke } from './helpers/mock-tauri.js';

test.describe('Mock Server UI', () => {
  test.beforeEach(async ({ page }) => {
    await mockTauriInvoke(page);
    await page.goto('/');
  });

  test('toggles proxy drawer and updates UI state', async ({ page }) => {
    const mockTab = page.locator('#mockServerTabBtn');
    await mockTab.click();

    const proxyDrawerBtn = page.locator('#toggleForwarderDrawerBtn');
    await proxyDrawerBtn.click();

    const proxyDrawer = page.locator('#mockForwarderDrawer');
    await expect(proxyDrawer).toBeVisible();

    const enableProxyCheckbox = page.locator('#mockForwarderEnabledCheck');
    await expect(enableProxyCheckbox).not.toBeChecked();

    await enableProxyCheckbox.check();
    await expect(enableProxyCheckbox).toBeChecked();

    const saveBtn = page.locator('#saveMockConfigBtn');
    await saveBtn.click();
    
    await expect(enableProxyCheckbox).toBeChecked();
  });
});
