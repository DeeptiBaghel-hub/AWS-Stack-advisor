const { test: base, expect } = require('@playwright/test');
const API_URL = `http://localhost:${process.env.E2E_API_PORT || 5050}/api`;

const test = base.extend({
  signedIn: [true, { option: true }],
});

test.beforeEach(async ({ page, request, signedIn }) => {
  if (!signedIn) return;

  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const response = await request.post(`${API_URL}/auth/register`, {
    data: { name: 'E2E User', email, password: 'password12345' },
  });
  if (!response.ok()) {
    throw new Error(`Could not create E2E session (${response.status()}).`);
  }

  const { token } = await response.json();
  // Load the app before writing the token so its AuthProvider picks up this
  // test user. Directly set storage rather than an init script: init scripts
  // rerun on every navigation and can silently undo sign-out/login flows.
  await page.goto('/');
  await page.evaluate((value) => localStorage.setItem('token', value), token);
  await page.reload();
});

module.exports = { test, expect };
