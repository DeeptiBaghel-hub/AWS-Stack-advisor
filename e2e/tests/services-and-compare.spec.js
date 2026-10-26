const { test, expect } = require('@playwright/test');

test.describe('Service catalog', () => {
  test('lists all 25 services on load', async ({ page }) => {
    await page.goto('/services');
    await expect(page.getByText('25 of 25 services')).toBeVisible();
    await expect(page.locator('.service-card')).toHaveCount(25);
  });

  test('the category filter narrows results correctly', async ({ page }) => {
    await page.goto('/services');
    await page.getByRole('button', { name: 'Containers' }).click();
    await expect(page.getByText('3 of 25 services')).toBeVisible();
    await expect(page.locator('.service-card')).toHaveCount(3);
  });

  test('search narrows results and an unmatched query shows the empty state', async ({ page }) => {
    await page.goto('/services');
    await page.fill('.catalog-search', 'Lambda');
    await expect(page.locator('.service-card')).toHaveCount(1);

    await page.fill('.catalog-search', 'this matches nothing at all xyz');
    await expect(page.getByText(/no services match/i)).toBeVisible();
  });

  test('clicking "compare this" on a card jumps into the compare page with that service pre-selected', async ({ page }) => {
    await page.goto('/services');
    await page.fill('.catalog-search', 'DynamoDB');
    await page.getByRole('link', { name: /compare this/i }).click();
    await expect(page).toHaveURL(/\/compare\?a=amazon-dynamodb/);
  });
});

test.describe('Compare page', () => {
  test('defaults to Lambda vs EC2 with a curated verdict', async ({ page }) => {
    await page.goto('/compare');
    await expect(page.locator('.verdict-card')).toBeVisible();
    await expect(page.locator('.compare-row')).toHaveCount(7);
  });

  test('clicking a featured pair updates both the URL and the comparison shown', async ({ page }) => {
    await page.goto('/compare');
    await page.getByRole('button', { name: /Amazon DynamoDB.*Amazon RDS/i }).click();
    await expect(page).toHaveURL(/a=amazon-dynamodb&b=amazon-rds/);
    await expect(page.locator('.compare-col-head').first()).toContainText('DynamoDB');
  });

  test('an uncommon pair still renders a full attribute table, just without a curated verdict', async ({ page }) => {
    await page.goto('/compare?a=amazon-sqs&b=amazon-sns');
    await expect(page.locator('.verdict-card')).toHaveCount(0);
    await expect(page.locator('.compare-table')).toBeVisible();
  });

  // Regression test for a real race condition: clicking through comparison
  // pairs quickly can resolve out of order (a slower first request
  // finishing after a faster second one), which would otherwise silently
  // show the wrong comparison for whatever's currently selected. This test
  // makes that race deterministic — rather than hoping for a lucky timing
  // window in real network conditions — by artificially delaying the
  // response for the FIRST pair clicked so it would resolve after the
  // second one if the race-guard weren't working.
  test('switching pairs quickly always shows the last one selected, never a stale earlier response', async ({ page }) => {
    await page.route('**/api/services/compare*', async (route) => {
      const url = new URL(route.request().url());
      const isFirstPair = url.searchParams.get('a') === 'aws-lambda';
      if (isFirstPair) {
        await new Promise((r) => setTimeout(r, 800)); // deliberately slow
      }
      await route.continue();
    });

    await page.goto('/compare'); // defaults to Lambda vs EC2 — the "slow" pair
    await page.getByRole('button', { name: /Amazon DynamoDB.*Amazon RDS/i }).click(); // fast pair, clicked right after

    await expect(page).toHaveURL(/a=amazon-dynamodb&b=amazon-rds/);
    // Give the slow, stale Lambda/EC2 response time to arrive and resolve
    // — if the race guard isn't working, it will incorrectly overwrite
    // the DynamoDB/RDS result that should be showing.
    await page.waitForTimeout(1000);
    await expect(page.locator('.compare-col-head').first()).toContainText('DynamoDB');
  });
});
