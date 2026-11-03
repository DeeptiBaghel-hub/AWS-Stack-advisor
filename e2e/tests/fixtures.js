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
  await page.addInitScript((value) => localStorage.setItem('token', value), token);
});

module.exports = { test, expect };
