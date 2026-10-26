const { test, expect } = require('@playwright/test');

test.describe('Terraform generation', () => {
  test('the danger banner and unsupported-service list are visible without needing an account', async ({ page }) => {
    await page.goto('/terraform');
    await expect(page.locator('.tf-danger-banner')).toBeVisible();
    await expect(page.locator('.tf-danger-title')).toHaveText(/read this before you run anything/i);
    await expect(page.locator('.tf-danger-banner')).toContainText(/creates real aws resources that cost real money/i);
  });

  test('download buttons are disabled until the acknowledgment checkbox is checked', async ({ page }) => {
    await page.goto('/terraform');
    const downloadButtons = page.locator('.tf-file-head button');
    await expect(downloadButtons.first()).toBeDisabled();

    await page.locator('.tf-ack input').check();
    await expect(downloadButtons.first()).toBeEnabled();
  });

  test('switching presets changes which services get templated', async ({ page }) => {
    await page.goto('/terraform');
    await page.getByRole('button', { name: 'Containerized service' }).click();
    await expect(page.getByText(/aws_ecs_cluster/)).toBeVisible();
  });

  test('a complex service is explicitly declined with a real reason, not silently dropped', async ({ page }) => {
    await page.goto('/terraform');
    await page.getByRole('button', { name: 'Static site + analytics' }).click();
    // This preset includes AWS Glue and Amazon Athena, neither of which
    // has a reviewed template.
    await expect(page.locator('.tf-unsupported-note')).toBeVisible();
    await expect(page.getByText(/no reviewed template exists yet/i)).toBeVisible();
  });

  test('the downloaded main.tf contains real, correct security defaults — not just any text', async ({ page }) => {
    await page.goto('/terraform');
    await page.locator('.tf-ack input').check();

    const downloadPromise = page.waitForEvent('download');
    // main.tf is the first file card for the default serverless preset.
    await page.locator('.tf-file-card', { hasText: 'main.tf' }).getByRole('button', { name: 'download' }).click();
    const download = await downloadPromise;

    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const content = Buffer.concat(chunks).toString('utf-8');

    expect(content).toContain('aws_lambda_function');
    expect(content).toContain('aws_dynamodb_table');
    expect(content).toContain('AWSLambdaBasicExecutionRole');
    // No hardcoded secrets anywhere in a real downloaded file.
    expect(content).not.toMatch(/password\s*=\s*"[^$][^"]*"/);
  });

  test('generating from a real recommendation uses its actual services, not the generic preset', async ({ page }) => {
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

    await page.getByRole('link', { name: /generate a terraform starting point/i }).click();
    await expect(page).toHaveURL(/\/terraform$/);
    await expect(page.getByText(/Using the services from/i)).toBeVisible();
    await expect(page.locator('.cost-source-note b')).toHaveText('A web API built for how your traffic behaves');
  });
});
