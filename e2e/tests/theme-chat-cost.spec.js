const { test, expect } = require('@playwright/test');

test.describe('Theme toggle', () => {
  test('toggling switches the data-theme attribute and persists across a reload', async ({ page }) => {
    await page.goto('/');
    const initial = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

    await page.locator('.theme-toggle').click();
    const toggled = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(toggled).not.toBe(initial);

    await page.reload();
    const afterReload = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(afterReload).toBe(toggled);
  });
});

test.describe('Chat widget', () => {
  test('opens on click, focuses the input, and Escape closes it', async ({ page }) => {
    await page.goto('/');
    await page.locator('.chat-fab').click();

    const panel = page.locator('.chat-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('role', 'dialog');
    await expect(page.locator('#chat-input')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(panel).not.toBeVisible();
    await expect(page.locator('.chat-fab')).toBeFocused();
  });

  test('starter prompts are visible before any message is sent', async ({ page }) => {
    await page.goto('/');
    await page.locator('.chat-fab').click();
    await expect(page.locator('.chat-starter')).toHaveCount(3);
  });
});

test.describe('Cost estimator', () => {
  test('shows a preset-based estimate by default, with a breakdown per service', async ({ page }) => {
    await page.goto('/cost-estimator');
    await expect(page.locator('.estimator-total-value')).toBeVisible();
    await expect(page.locator('.estimator-line').first()).toBeVisible();
  });

  test('moving a slider changes the total', async ({ page }) => {
    await page.goto('/cost-estimator');
    const totalBefore = await page.locator('.estimator-total-value').textContent();

    const slider = page.locator('.slider-field input[type="range"]').first();
    await slider.fill('90000');

    await expect(page.locator('.estimator-total-value')).not.toHaveText(totalBefore);
  });

  test('switching presets changes which services are estimated', async ({ page }) => {
    await page.goto('/cost-estimator');
    await page.getByRole('button', { name: 'Static site + analytics' }).click();
    await expect(page.getByText('Amazon CloudFront')).toBeVisible();
  });

  // Regression test: same root cause as the QuizPage tweak-navigation bug
  // — presetKey's initial value is derived from location.state once at
  // mount, so arriving here with a real recommendation, then navigating
  // to this same route again via a plain nav link (no state), left the
  // preset picker showing with no pill highlighted as active even though
  // it had silently fallen back to using the serverless preset underneath.
  test('navigating here again via the plain nav link after a recommendation-backed visit shows a correctly highlighted preset', async ({ page }) => {
    await page.goto('/quiz');
    const clickByText = async (text) => {
      await page.getByRole('button', { name: new RegExp(text, 'i') }).first().click();
      await page.waitForTimeout(220);
    };
    await clickByText('A web app or API');
    await clickByText('None — fully serverless');
    await clickByText('Spiky or bursty');
    await clickByText('Yes, flexible / NoSQL');
    await clickByText('Startup / prototype');
    await page.waitForURL('/results');

    await page.getByRole('link', { name: /rough monthly cost estimate/i }).click();
    await expect(page).toHaveURL(/\/cost-estimator$/);
    await expect(page.locator('.cost-source-note')).toBeVisible();

    await page.locator('.nav-links').getByRole('link', { name: 'cost' }).click();

    await expect(page.locator('.cost-source-note')).toHaveCount(0);
    await expect(page.locator('.preset-pills')).toBeVisible();
    await expect(page.locator('.pill.active')).toHaveCount(1);
  });
});
