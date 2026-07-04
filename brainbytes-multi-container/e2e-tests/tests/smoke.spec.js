const { test, expect } = require('@playwright/test');
 
test.describe('BrainBytes frontend smoke test', () => {
  test('homepage loads successfully', async ({ page }) => {
    const response = await page.goto('/');
    expect(response.ok()).toBeTruthy();
  });
 
  test('homepage renders without a client-side error overlay', async ({ page }) => {
    await page.goto('/');
    // Next.js dev/error overlays use this selector; in production builds
    // an unhandled render error would instead leave the page blank, so we
    // also check that *something* rendered in <body>.
    const errorOverlay = page.locator('nextjs-portal');
    await expect(errorOverlay).toHaveCount(0);
 
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });
});