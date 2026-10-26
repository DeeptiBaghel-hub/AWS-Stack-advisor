function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

// Fills and submits the register form, waits for the redirect back to "/"
// that a successful registration triggers. Returns the credentials used,
// so a test can log back in with them later if needed.
async function registerNewUser(page, { name = 'Test User', prefix = 'user' } = {}) {
  const email = uniqueEmail(prefix);
  const password = 'password12345';

  await page.goto('/register');
  await page.fill('#name', name);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');

  return { name, email, password };
}

module.exports = { uniqueEmail, registerNewUser };
