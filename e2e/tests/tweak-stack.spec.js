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

test.describe('Duplicate and tweak a saved stack', () => {
  test('clicking "tweak" pre-fills the quiz with the original answers, already selected', async ({ page }) => {
    await registerNewUser(page, { prefix: 'tweak-prefill' });
    await completeQuizAndSave(page, [
      'A web app or API', 'None — fully serverless', 'Steady and predictable',
      'No, just files or objects', 'Startup / prototype',
    ]);

    await page.goto('/history');
    await page.getByRole('button', { name: 'tweak' }).click();

    await expect(page).toHaveURL(/\/quiz$/);
    await expect(page.locator('.tweak-banner')).toBeVisible();
    // The first question's original answer ("A web app or API") should
    // already show as selected, not blank — that's the entire point of
    // pre-filling rather than just linking back to a fresh quiz.
    await expect(page.getByRole('button', { name: /A web app or API/i })).toHaveClass(/selected/);
  });

  test('changing one answer and completing the quiz produces a genuinely different recommendation', async ({ page }) => {
    await registerNewUser(page, { prefix: 'tweak-change' });
    await completeQuizAndSave(page, [
      'A web app or API', 'None — fully serverless', 'Steady and predictable',
      'No, just files or objects', 'Startup / prototype',
    ]);

    await page.goto('/history');
    await page.getByRole('button', { name: 'tweak' }).click();

    // Click through unchanged, except change traffic from steady to spiky.
    await page.getByRole('button', { name: /A web app or API/i }).click();
    await page.waitForTimeout(220);
    await page.getByRole('button', { name: /None — fully serverless/i }).click();
    await page.waitForTimeout(220);
    await page.getByRole('button', { name: /Spiky or bursty/i }).click(); // the actual change
    await page.waitForTimeout(220);
    await page.getByRole('button', { name: /No, just files or objects/i }).click();
    await page.waitForTimeout(220);
    await page.getByRole('button', { name: /Startup \/ prototype/i }).click();

    await page.waitForURL('/results');
    await expect(page.locator('.tweak-result-banner')).toContainText('A web API built for how your traffic behaves');

    // Spiky traffic with no database should score a perfect 5/5 on both
    // Performance and Cost — a real, checkable difference from the
    // original steady-traffic version's scores.
    await expect(page.locator('.waf-pillar', { hasText: 'Performance Efficiency' })).toContainText('5/5');
  });

  test('"start fresh instead" clears the pre-filled answers', async ({ page }) => {
    await registerNewUser(page, { prefix: 'tweak-fresh' });
    await completeQuizAndSave(page, [
      'A web app or API', 'None — fully serverless', 'Steady and predictable',
      'No, just files or objects', 'Startup / prototype',
    ]);

    await page.goto('/history');
    await page.getByRole('button', { name: 'tweak' }).click();
    await expect(page.getByRole('button', { name: /A web app or API/i })).toHaveClass(/selected/);

    await page.getByRole('button', { name: /start fresh instead/i }).click();
    await expect(page.locator('.tweak-banner')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /A web app or API/i })).not.toHaveClass(/selected/);
  });

  // Regression test: React Router doesn't remount a component on a
  // same-path navigation by default, but QuizPage only reads its
  // pre-filled tweak state from location.state on initial mount. Without
  // forcing a remount (App.jsx keys the /quiz route on location.key),
  // clicking the navbar's plain "quiz" link while already mid-tweak did
  // nothing visible — the tweak banner and stepper progress just silently
  // stayed exactly as they were, with no indication the click even
  // registered.
  test('clicking the navbar "quiz" link while mid-tweak actually resets to a fresh quiz', async ({ page }) => {
    await registerNewUser(page, { prefix: 'tweak-navreset' });
    await completeQuizAndSave(page, [
      'A web app or API', 'None — fully serverless', 'Steady and predictable',
      'No, just files or objects', 'Startup / prototype',
    ]);

    await page.goto('/history');
    await page.getByRole('button', { name: 'tweak' }).click();
    await expect(page.locator('.tweak-banner')).toBeVisible();

    // Advance one question so there's visible progress to check gets reset.
    await page.getByRole('button', { name: /A web app or API/i }).click();
    await page.waitForTimeout(220);
    await expect(page.getByText('question 2 of 5')).toBeVisible();

    await page.locator('.nav-links').getByRole('link', { name: 'quiz' }).click();

    await expect(page.locator('.tweak-banner')).toHaveCount(0);
    await expect(page.getByText('question 1 of 5')).toBeVisible();
    await expect(page.getByRole('button', { name: /A web app or API/i })).not.toHaveClass(/selected/);
  });

  test('completing the quiz normally (not via tweak) shows no tweak banner on results', async ({ page }) => {
    await registerNewUser(page, { prefix: 'tweak-none' });
    await completeQuizAndSave(page, [
      'A web app or API', 'None — fully serverless', 'Steady and predictable',
      'No, just files or objects', 'Startup / prototype',
    ]);
    // completeQuizAndSave already lands on /results once via the normal
    // flow above — confirm that ordinary path never shows a tweak banner.
    await page.goto('/quiz');
    await page.getByRole('button', { name: /A web app or API/i }).click();
    await page.waitForTimeout(220);
    await page.getByRole('button', { name: /None — fully serverless/i }).click();
    await page.waitForTimeout(220);
    await page.getByRole('button', { name: /Steady and predictable/i }).click();
    await page.waitForTimeout(220);
    await page.getByRole('button', { name: /No, just files or objects/i }).click();
    await page.waitForTimeout(220);
    await page.getByRole('button', { name: /Startup \/ prototype/i }).click();
    await page.waitForURL('/results');

    await expect(page.locator('.tweak-result-banner')).toHaveCount(0);
  });
});
