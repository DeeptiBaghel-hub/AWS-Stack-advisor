const { test, expect } = require('@playwright/test');

test.describe('Free-text description intake', () => {
  test('the mode toggle switches between the stepped quiz and the describe form', async ({ page }) => {
    await page.goto('/quiz');
    await expect(page.locator('.opt')).toHaveCount(7); // first quiz question's options

    await page.getByRole('tab', { name: /describe it in words/i }).click();
    await expect(page.locator('.describe-textarea')).toBeVisible();

    await page.getByRole('tab', { name: /answer questions/i }).click();
    await expect(page.locator('.opt').first()).toBeVisible();
  });

  test('the character counter updates and the submit button is disabled until the minimum length is met', async ({ page }) => {
    await page.goto('/quiz');
    await page.getByRole('tab', { name: /describe it in words/i }).click();

    const submit = page.getByRole('button', { name: /get my recommendation/i });
    await expect(submit).toBeDisabled();

    await page.fill('.describe-textarea', 'too short');
    await expect(page.getByText(/a little more detail helps/i)).toBeVisible();
    await expect(submit).toBeDisabled();

    await page.fill('.describe-textarea', 'A food delivery app with fifty thousand users and a Postgres database.');
    await expect(page.getByText(/^\d+\/1000$/)).toBeVisible();
    await expect(submit).toBeEnabled();
  });

  // Costs a real Gemini API call, so this only runs when a real key is
  // actually configured for the test environment — otherwise it's skipped
  // rather than failing on an environment precondition it can't control.
  test('a real description produces a grounded recommendation with a transparency banner', async ({ page }) => {
    test.skip(!process.env.E2E_HAS_GEMINI_KEY, 'requires a real GEMINI_API_KEY configured on the API server for this run');

    await page.goto('/quiz');
    await page.getByRole('tab', { name: /describe it in words/i }).click();
    await page.fill(
      '.describe-textarea',
      'I want to build a food delivery app with 50k users, image uploads, PostgreSQL, and low cost.'
    );
    await page.getByRole('button', { name: /get my recommendation/i }).click();

    await page.waitForURL('/results', { timeout: 15_000 });
    await expect(page.locator('.extracted-banner')).toBeVisible();
    await expect(page.locator('.extracted-chip')).toHaveCount(5);
    await expect(page.getByRole('link', { name: /answer the questions manually instead/i })).toBeVisible();
  });

  test('without a configured API key, the describe form fails with a clear, non-crashing error', async ({ page }) => {
    test.skip(!!process.env.E2E_HAS_GEMINI_KEY, 'this test specifically covers the no-key case');

    await page.goto('/quiz');
    await page.getByRole('tab', { name: /describe it in words/i }).click();
    await page.fill(
      '.describe-textarea',
      'A reasonably detailed description of some project, long enough to pass validation.'
    );
    await page.getByRole('button', { name: /get my recommendation/i }).click();

    await expect(page.locator('.form-error')).toBeVisible({ timeout: 10_000 });
    // The page should still be usable afterward — not a crashed white screen.
    await expect(page.locator('.describe-textarea')).toBeVisible();
  });

  // Regression test for a real bug found during a bug hunt, same root
  // cause as QuizPage's version: DescribeForm's submission handler runs a
  // multi-second chain of awaited sleeps before its final
  // navigate('/results') call, but the mode-toggle "Answer questions" tab
  // stays visible and clickable the whole time — clicking it partway
  // through unmounts DescribeForm, yet the async function kept running
  // and would still fire navigate() and yank the user back once it
  // finished. Route interception mocks a successful response here so this
  // is deterministic and doesn't need a real Gemini key configured.
  test('switching to "Answer questions" mid-submission does not get you hijacked back to /results once it finishes', async ({ page }) => {
    await page.route('**/api/recommend/from-description', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'A mocked recommendation',
          diagram: { nodes: [{ id: 'a', tag: 'entry', name: 'Client', entry: true }], edges: [] },
          why: [],
          footnotes: [],
          wellArchitected: null,
          extracted: { workload: 'web-api', ops: 'serverless', traffic: 'unsure', db: 'unsure', scale: 'growing' },
          description: 'mocked description',
        }),
      });
    });

    await page.goto('/quiz');
    await page.getByRole('tab', { name: /describe it in words/i }).click();
    await page.fill(
      '.describe-textarea',
      'A reasonably detailed description of some project, long enough to pass validation.'
    );
    await page.getByRole('button', { name: /get my recommendation/i }).click();
    await page.waitForTimeout(300); // let the submission sequence actually start

    await page.getByRole('tab', { name: /answer questions/i }).click();
    await expect(page.locator('.opt').first()).toBeVisible();

    // Wait out the full original submission sequence (well past when its
    // navigate('/results') call would have fired) and confirm it never
    // hijacked the page away from the quiz mode the user switched to.
    await page.waitForTimeout(2500);
    await expect(page).toHaveURL(/\/quiz$/);
    await expect(page.locator('.opt').first()).toBeVisible();
  });
});
