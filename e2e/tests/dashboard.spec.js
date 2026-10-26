const { test, expect } = require('@playwright/test');
const { registerNewUser } = require('./helpers');

async function completeQuiz(page, choices) {
  await page.goto('/quiz');
  for (const choice of choices) {
    await page.getByRole('button', { name: new RegExp(choice, 'i') }).first().click();
    await page.waitForTimeout(220);
  }
  await page.waitForURL('/results');
}

test.describe('Dashboard', () => {
  test('is protected — visiting it while signed out redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('shows a friendly empty state with zero saved stacks', async ({ page }) => {
    await registerNewUser(page, { name: 'Dash Empty', prefix: 'dash-empty' });
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: /welcome back, dash/i })).toBeVisible();
    await expect(page.getByText(/haven't saved a stack yet/i)).toBeVisible();
    await expect(page.locator('.dash-stat-value').first()).toHaveText('0');
  });

  test('reflects real saved stacks: count, recent activity, and workload breakdown', async ({ page }) => {
    await registerNewUser(page, { name: 'Dash User', prefix: 'dash-data' });

    await completeQuiz(page, [
      'A web app or API',
      'None — fully serverless',
      'Spiky or bursty',
      'Yes, flexible / NoSQL',
      'Startup / prototype',
    ]);
    await page.getByRole('button', { name: /save to my history/i }).click();
    await expect(page.getByText(/saved to your history/i)).toBeVisible();

    await completeQuiz(page, [
      'Containerized microservices',
      'Some — managed containers',
      'Not sure yet',
      'No, just files or objects',
      'Enterprise',
    ]);
    await page.getByRole('button', { name: /save to my history/i }).click();
    await expect(page.getByText(/saved to your history/i)).toBeVisible();

    await page.goto('/dashboard');
    await expect(page.locator('.dash-stat-value').first()).toHaveText('2');
    await expect(page.locator('.dash-recent-item')).toHaveCount(2);

    // Two different workload answers were used above, so the breakdown
    // should show two distinct rows, not a single collapsed bucket.
    await expect(page.locator('.dash-breakdown-row')).toHaveCount(2);

    // A Well-Architected average section should appear once at least one
    // saved stack has a score — both of these do.
    await expect(page.getByText(/average well-architected score across 2 saved stacks/i)).toBeVisible();
    await expect(page.locator('.dash-waf-pillar')).toHaveCount(6);
  });

  test('quick links on the dashboard actually navigate', async ({ page }) => {
    await registerNewUser(page, { prefix: 'dash-links' });
    await page.goto('/dashboard');

    await page.locator('.dash-quick-link', { hasText: 'Take the quiz' }).click();
    await expect(page).toHaveURL(/\/quiz$/);
  });

  test('the landing page welcome banner links to the dashboard', async ({ page }) => {
    await registerNewUser(page, { prefix: 'dash-landing-link' });
    await page.getByRole('link', { name: /go to dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
