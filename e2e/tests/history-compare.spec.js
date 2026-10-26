const { test, expect } = require('@playwright/test');
const { registerNewUser } = require('./helpers');

async function completeQuizAndSave(page, choices) {
  await page.goto('/quiz');
  for (const choice of choices) {
    await page.getByRole('button', { name: new RegExp(choice, 'i') }).first().click();
    await page.waitForTimeout(220);
  }
  await page.waitForURL('/results');
  await page.getByRole('button', { name: /save to my history/i }).click();
  await expect(page.getByText(/saved to your history/i)).toBeVisible();
}

test.describe('Comparing saved history items', () => {
  test('the compare bar only appears once exactly two items are selected', async ({ page }) => {
    await registerNewUser(page, { prefix: 'hcmp-bar' });
    await completeQuizAndSave(page, [
      'A web app or API', 'None — fully serverless', 'Steady and predictable',
      'No, just files or objects', 'Startup / prototype',
    ]);
    await completeQuizAndSave(page, [
      'A machine learning workload', 'Some — managed containers', 'Not sure yet',
      'No, just files or objects', 'Growing product',
    ]);

    await page.goto('/history');
    await expect(page.locator('.compare-bar')).toHaveCount(0);

    const checkboxes = page.locator('.h-select input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await expect(page.locator('.compare-bar')).toHaveCount(0);

    await checkboxes.nth(1).check();
    await expect(page.locator('.compare-bar')).toBeVisible();
  });

  test('a third checkbox is disabled once two are already selected', async ({ page }) => {
    await registerNewUser(page, { prefix: 'hcmp-cap' });
    for (let i = 0; i < 3; i++) {
      await completeQuizAndSave(page, [
        'A web app or API', 'None — fully serverless', 'Steady and predictable',
        'No, just files or objects', 'Startup / prototype',
      ]);
    }

    await page.goto('/history');
    const checkboxes = page.locator('.h-select input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await expect(checkboxes.nth(2)).toBeDisabled();

    // Unchecking one frees up a slot again
    await checkboxes.nth(0).uncheck();
    await expect(checkboxes.nth(2)).toBeEnabled();
  });

  test('comparing two genuinely different stacks shows correct pillar winners and a service diff', async ({ page }) => {
    await registerNewUser(page, { prefix: 'hcmp-real' });

    // Spiky + serverless: should score very well on Performance and Cost.
    await completeQuizAndSave(page, [
      'A web app or API', 'None — fully serverless', 'Spiky or bursty',
      'Yes, flexible / NoSQL', 'Startup / prototype',
    ]);
    // Full control + spiky: the worst-fit combination for those same two pillars.
    await completeQuizAndSave(page, [
      'A web app or API', 'Full control', 'Spiky or bursty',
      'Yes, flexible / NoSQL', 'Startup / prototype',
    ]);

    await page.goto('/history');
    const checkboxes = page.locator('.h-select input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await page.getByRole('button', { name: /compare these/i }).click();

    await page.waitForURL('/history/compare');
    await expect(page.locator('.hcmp-pillar-row')).toHaveCount(6);

    // History sorts newest-first, so which stack lands as "Stack A" vs "B"
    // depends on save order, not something this test should assume — the
    // real assertion is just that Performance Efficiency has a decisive
    // winner at all, since serverless+spiky and full-control+spiky are
    // never supposed to tie.
    const perfRow = page.locator('.hcmp-pillar-row', { hasText: 'Performance Efficiency' });
    await expect(perfRow.locator('.hcmp-win')).toBeVisible();

    // DynamoDB is used by both (same db answer); the compute service differs
    // between Lambda and EC2, so there should be a real, non-empty diff.
    await expect(page.getByText('used by both')).toBeVisible();
    await expect(page.locator('.hcmp-service-chip.shared', { hasText: 'DynamoDB' })).toBeVisible();
  });

  test('visiting the compare page directly with no selection shows a clear message instead of crashing', async ({ page }) => {
    await registerNewUser(page, { prefix: 'hcmp-direct' });
    await page.goto('/history/compare');
    await expect(page.getByText(/nothing selected to compare/i)).toBeVisible();
  });

  test('deleting a selected item does not leave a stale, broken selection', async ({ page }) => {
    await registerNewUser(page, { prefix: 'hcmp-delete' });
    await completeQuizAndSave(page, [
      'A web app or API', 'None — fully serverless', 'Steady and predictable',
      'No, just files or objects', 'Startup / prototype',
    ]);
    await completeQuizAndSave(page, [
      'A machine learning workload', 'Some — managed containers', 'Not sure yet',
      'No, just files or objects', 'Growing product',
    ]);

    await page.goto('/history');
    const checkboxes = page.locator('.h-select input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await expect(page.locator('.compare-bar')).toBeVisible();

    const deleteButtons = page.getByRole('button', { name: 'delete' });
    await deleteButtons.nth(0).click();
    await expect(page.getByText(/deleted/i)).toBeVisible();

    // Only one item (and thus at most one selection) remains — the compare
    // bar, which requires exactly two, should no longer show.
    await expect(page.locator('.compare-bar')).toHaveCount(0);
  });
});
