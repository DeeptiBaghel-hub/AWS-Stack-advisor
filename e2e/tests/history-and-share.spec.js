const { test, expect } = require('@playwright/test');
const { registerNewUser } = require('./helpers');

async function completeQuiz(page) {
  await page.goto('/quiz');
  const choices = [
    'A web app or API',
    'None — fully serverless',
    'Steady and predictable',
    'No, just files or objects',
    'Startup / prototype',
  ];
  for (const choice of choices) {
    await page.getByRole('button', { name: new RegExp(choice, 'i') }).first().click();
    await page.waitForTimeout(220);
  }
  await page.waitForURL('/results');
}

test.describe('History and sharing', () => {
  test('saving a result adds it to history, and it can be viewed and deleted', async ({ page }) => {
    await registerNewUser(page, { prefix: 'history' });
    await completeQuiz(page);

    await page.getByRole('button', { name: /save to my history/i }).click();
    await expect(page.getByText(/saved to your history/i)).toBeVisible();

    await page.goto('/history');
    await expect(page.locator('.history-item')).toHaveCount(1);

    await page.getByRole('button', { name: 'view' }).click();
    await expect(page.locator('.d-node')).not.toHaveCount(0);
    await expect(page.locator('.waf-pillar')).toHaveCount(6);

    await page.getByRole('button', { name: 'delete' }).click();
    await expect(page.getByText(/deleted/i)).toBeVisible();
    await expect(page.locator('.history-item')).toHaveCount(0);
    await expect(page.getByText(/nothing saved yet/i)).toBeVisible();
  });

  test('history only ever shows the signed-in user\'s own saved recommendations', async ({ page, context }) => {
    await registerNewUser(page, { prefix: 'isolation-a' });
    await completeQuiz(page);
    await page.getByRole('button', { name: /save to my history/i }).click();
    await expect(page.getByText(/saved to your history/i)).toBeVisible();

    const otherPage = await context.browser().newContext().then((c) => c.newPage());
    await registerNewUser(otherPage, { prefix: 'isolation-b' });
    await otherPage.goto('/history');
    await expect(otherPage.getByText(/nothing saved yet/i)).toBeVisible();
  });

  test('a shared link opens publicly, with no auth, in a completely separate browser context', async ({ page, browser }) => {
    await registerNewUser(page, { prefix: 'share' });
    await completeQuiz(page);
    await page.getByRole('button', { name: /save to my history/i }).click();
    await expect(page.getByText(/saved to your history/i)).toBeVisible();

    const token = await page.evaluate(() => localStorage.getItem('token'));
    const historyRes = await page.request.get('http://localhost:5050/api/recommend/history', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { recommendations } = await historyRes.json();
    const shareId = recommendations[0].shareId;

    const freshContext = await browser.newContext();
    const sharedPage = await freshContext.newPage();
    await sharedPage.goto(`/shared/${shareId}`);

    await expect(sharedPage.locator('.shared-banner')).toBeVisible();
    await expect(sharedPage.getByRole('link', { name: /sign in/i })).toBeVisible();
    await expect(sharedPage.locator('.d-node')).not.toHaveCount(0);
    await expect(sharedPage.locator('.waf-pillar')).toHaveCount(6);
    await freshContext.close();
  });

  test('a nonexistent share link shows a clear "not found" state instead of a blank page', async ({ page }) => {
    await page.goto('/shared/this-share-id-does-not-exist');
    await expect(page.getByText(/doesn't point to anything|doesn't exist/i)).toBeVisible();
  });

  test('exporting JSON from history includes createdAt but strips Mongo-internal fields', async ({ page }) => {
    await registerNewUser(page, { prefix: 'history-json' });
    await completeQuiz(page);
    await page.getByRole('button', { name: /save to my history/i }).click();
    await expect(page.getByText(/saved to your history/i)).toBeVisible();

    await page.goto('/history');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'JSON' }).click();
    const download = await downloadPromise;

    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const content = JSON.parse(Buffer.concat(chunks).toString('utf-8'));

    expect(content.createdAt).toBeTruthy();
    expect(content._id).toBeUndefined();
    expect(content.user).toBeUndefined();
    expect(content.answers).toBeUndefined();
    expect(content.shareId).toBeUndefined();
  });
});
