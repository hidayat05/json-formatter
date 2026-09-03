import { test, expect } from '@playwright/test';
import { mockTauriInvoke } from './helpers/mock-tauri.js';

test.describe('Converter UI', () => {
  test.beforeEach(async ({ page }) => {
    await mockTauriInvoke(page);
    await page.goto('/');
  });

  test('formats JSON correctly via UI', async ({ page }) => {
    const jsonEditor = page.locator('#inputText');
    await expect(jsonEditor).toBeVisible();

    await jsonEditor.fill('{"bad": "json"');
    const formatBtn = page.locator('#formatBtn');
    await formatBtn.click();

    const outputEditor = page.locator('#outputText');
    await jsonEditor.fill('{"good":"json"}');
    await formatBtn.click();

    await expect(outputEditor).toHaveValue('{\n  "good": "json"\n}');
  });
});
