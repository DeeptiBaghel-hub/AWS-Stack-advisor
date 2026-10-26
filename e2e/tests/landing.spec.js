const { test, expect } = require('@playwright/test');

test.describe('Landing page', () => {
  test('shows the three main entry points, not just the quiz', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.entry-card')).toHaveCount(3);
    await expect(page.getByRole('heading', { name: /toolkit for picking an AWS architecture/i })).toBeVisible();
  });

  test('the quiz entry card links to /quiz', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /start the assessment/i }).click();
    await expect(page).toHaveURL(/\/quiz$/);
  });

  test('the catalog entry card links to /services', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /see all services/i }).click();
    await expect(page).toHaveURL(/\/services$/);
  });

  test('the compare entry card links to /compare', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /compare services/i }).click();
    await expect(page).toHaveURL(/\/compare$/);
  });

  test('the example diagram on the landing page renders a real branch', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.d-node')).toHaveCount(4);
    await expect(page.locator('.d-node.optional')).toHaveCount(1);
  });

  test('an unknown route shows the 404 page, not a blank screen', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByText(/doesn't exist/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible();
  });
});
