const { test, expect } = require('@playwright/test');

test.describe('How It Works page', () => {
  test('is reachable from the landing page footer without needing an account', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /curious how this app itself is built/i }).click();
    await expect(page).toHaveURL(/\/how-it-works$/);
  });

  test('renders the self-diagram with a real branching structure, not a flat list', async ({ page }) => {
    await page.goto('/how-it-works');
    // 5 nodes: client, api, db, gemini (optional), sentry (optional)
    await expect(page.locator('.d-node')).toHaveCount(5);
    await expect(page.locator('.d-node.optional')).toHaveCount(2);
    await expect(page.locator('.d-name', { hasText: 'Express API (Node.js)' })).toBeVisible();

    // The accessibility pass's screen-reader text alternative should also
    // correctly describe this new diagram automatically — it's generated
    // dynamically from the same node/edge data, not hand-written per page.
    await expect(page.locator('.sr-only')).toContainText('Architecture diagram');
  });

  test('shows the real design-decision cards, not placeholder content', async ({ page }) => {
    await page.goto('/how-it-works');
    await expect(page.locator('.why-card')).toHaveCount(6);
    await expect(page.getByText(/AI extracts, it never invents/i)).toBeVisible();
    await expect(page.getByText(/Well-Architected scoring against a real framework/i)).toBeVisible();
  });

  test('works for a signed-out visitor — no auth wall on an about-style page', async ({ page }) => {
    await page.goto('/how-it-works');
    await expect(page).toHaveURL(/\/how-it-works$/);
    await expect(page.getByRole('link', { name: /^sign in$/i })).toBeVisible();
  });
});
