const { test, expect } = require('@playwright/test');

async function answerQuiz(page, choices) {
  for (const choice of choices) {
    await page.getByRole('button', { name: new RegExp(choice, 'i') }).first().click();
    await page.waitForTimeout(220); // matches the app's own auto-advance delay
  }
}

test.describe('Stepped quiz', () => {
  test('answering all five questions produces a real, branching recommendation', async ({ page }) => {
    await page.goto('/quiz');

    await answerQuiz(page, [
      'A web app or API',
      'None — fully serverless',
      'Spiky or bursty',
      'Yes, flexible / NoSQL',
      'Startup / prototype',
    ]);

    await page.waitForURL('/results');
    await expect(page.getByRole('heading', { name: /traffic behaves/i })).toBeVisible();

    // Spiky traffic + a database should branch to an optional cache — this
    // is the single most direct proof the diagram is a real graph, not a
    // hardcoded chain.
    await expect(page.locator('.d-node.optional')).toHaveCount(2);
  });

  test('the progress stepper advances and back navigation works', async ({ page }) => {
    await page.goto('/quiz');
    await expect(page.getByText('question 1 of 5')).toBeVisible();

    await page.getByRole('button', { name: /A web app or API/i }).click();
    await page.waitForTimeout(220);
    await expect(page.getByText('question 2 of 5')).toBeVisible();

    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByText('question 1 of 5')).toBeVisible();
  });

  test('a completed recommendation shows a Well-Architected review with all 6 pillars', async ({ page }) => {
    await page.goto('/quiz');
    await answerQuiz(page, [
      'Containerized microservices',
      'Some — managed containers',
      'Not sure yet',
      'No, just files or objects',
      'Enterprise',
    ]);

    await page.waitForURL('/results');
    await expect(page.locator('.waf-pillar')).toHaveCount(6);
    await expect(page.locator('.waf-overall-value')).toBeVisible();
  });

  test('exporting a PDF triggers a real file download', async ({ page }) => {
    await page.goto('/quiz');
    await answerQuiz(page, [
      'A web app or API',
      'None — fully serverless',
      'Steady and predictable',
      'No, just files or objects',
      'Startup / prototype',
    ]);
    await page.waitForURL('/results');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export as pdf/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('exporting JSON downloads a file with the actual recommendation content, not just the right extension', async ({ page }) => {
    await page.goto('/quiz');
    await answerQuiz(page, [
      'A web app or API',
      'None — fully serverless',
      'Spiky or bursty',
      'Yes, flexible / NoSQL',
      'Startup / prototype',
    ]);
    await page.waitForURL('/results');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export as json/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/);

    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const content = JSON.parse(Buffer.concat(chunks).toString('utf-8'));

    expect(content.title).toBe('A web API built for how your traffic behaves');
    expect(Array.isArray(content.why)).toBe(true);
    expect(content.diagram.nodes.length).toBeGreaterThan(0);
    expect(content.wellArchitected.pillars).toHaveLength(6);
    // Never leak Mongo-internal fields, even though this particular export
    // happens before the result is ever saved (so they wouldn't exist here
    // anyway) — this is the contract the export function itself should hold.
    expect(content._id).toBeUndefined();
    expect(content.user).toBeUndefined();
  });

  // Regression test for a real bug found during a bug hunt: the
  // submission handler runs a multi-second chain of awaited sleeps (for
  // the staged loading animation) before its final navigate('/results')
  // call. Clicking away to a different in-app page partway through — a
  // completely ordinary thing to do — unmounts QuizPage, but the async
  // function keeps running to completion regardless, and navigate()
  // doesn't care whether its caller is still mounted. Without a
  // mounted-guard, that meant getting silently yanked back to /results a
  // couple seconds after intentionally navigating elsewhere.
  test('navigating away mid-submission does not get you hijacked back to /results once it finishes', async ({ page }) => {
    await page.goto('/quiz');
    await answerQuiz(page, [
      'A web app or API',
      'None — fully serverless',
      'Steady and predictable',
      'No, just files or objects',
    ]);
    // Click the LAST answer, kicking off the ~2 second staged submission
    // sequence, then immediately navigate away via a real in-app link
    // before it finishes.
    await page.getByRole('button', { name: /Startup \/ prototype/i }).click();
    await page.waitForTimeout(300); // let the submission sequence actually start
    await page.locator('.nav-links').getByRole('link', { name: 'services' }).click();
    await expect(page).toHaveURL(/\/services$/);

    // Wait out the full original submission sequence (well past when its
    // navigate('/results') call would have fired) and confirm it never
    // hijacked the page away from where the user actually chose to go.
    await page.waitForTimeout(2500);
    await expect(page).toHaveURL(/\/services$/);
  });
});
