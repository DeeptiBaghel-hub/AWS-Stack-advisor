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
  // Playwright runs init scripts on every document navigation. Install the
  // fixture token only once per tab so later sign-out, registration, and
  // login flows can replace or remove it normally.
  await page.addInitScript((value) => {
    if (sessionStorage.getItem('__e2e_auth_injected')) return;
    localStorage.setItem('token', value);
    sessionStorage.setItem('__e2e_auth_injected', '1');
  }, token);
});

module.exports = { test, expect };
