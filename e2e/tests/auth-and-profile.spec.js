const { test, expect } = require('@playwright/test');
const { registerNewUser, uniqueEmail } = require('./helpers');

test.describe('Auth and profile', () => {
  test('registering logs you in and personalizes the landing page', async ({ page }) => {
    const { name } = await registerNewUser(page, { name: 'Deepti Sharma', prefix: 'landing' });
    await expect(page.getByText(new RegExp(`Welcome back, ${name.split(' ')[0]}`, 'i'))).toBeVisible();
    await expect(page.getByText(/haven't saved a stack yet/i)).toBeVisible();
  });

  test('logging out and back in with the same credentials works', async ({ page }) => {
    const { email, password } = await registerNewUser(page, { prefix: 'relogin' });

    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page.getByRole('link', { name: /^sign in$/i })).toBeVisible();

    await page.goto('/login');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });

  test('logging in with the wrong password shows an inline error, not a crash', async ({ page }) => {
    const { email } = await registerNewUser(page, { prefix: 'wrongpw' });
    await page.getByRole('button', { name: /sign out/i }).click();

    await page.goto('/login');
    await page.fill('#email', email);
    await page.fill('#password', 'definitely-the-wrong-password');
    await page.click('button[type="submit"]');

    await expect(page.locator('.form-error')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('registering with an already-used email is rejected', async ({ page }) => {
    const email = uniqueEmail('dupe');
    await page.goto('/register');
    await page.fill('#name', 'First');
    await page.fill('#email', email);
    await page.fill('#password', 'password12345');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.getByRole('button', { name: /sign out/i }).click();

    await page.goto('/register');
    await page.fill('#name', 'Second');
    await page.fill('#email', email);
    await page.fill('#password', 'password12345');
    await page.click('button[type="submit"]');
    await expect(page.locator('.form-error')).toBeVisible();
  });

  test('updating the display name is reflected immediately in the navbar', async ({ page }) => {
    await registerNewUser(page, { name: 'Old Name', prefix: 'rename' });
    await page.goto('/profile');

    await page.fill('#name', '');
    await page.fill('#name', 'New Display Name');
    await page.getByRole('button', { name: /save name/i }).click();

    await expect(page.getByRole('link', { name: 'New Display Name' })).toBeVisible();
  });

  test('changing the password actually works end to end (old password stops working, new one logs in)', async ({ page }) => {
    const { email } = await registerNewUser(page, { prefix: 'changepw' });
    await page.goto('/profile');

    await page.fill('#currentPassword', 'password12345');
    await page.fill('#newPassword', 'brandnewpassword999');
    await page.fill('#confirmPassword', 'brandnewpassword999');
    await page.getByRole('button', { name: /update password/i }).click();
    await expect(page.getByText(/password changed/i)).toBeVisible();

    await page.getByRole('button', { name: /sign out/i }).click();
    await page.goto('/login');
    await page.fill('#email', email);
    await page.fill('#password', 'brandnewpassword999');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });

  test('changing the password with the wrong current password is rejected', async ({ page }) => {
    await registerNewUser(page, { prefix: 'wrongcurrpw' });
    await page.goto('/profile');

    await page.fill('#currentPassword', 'not-the-real-password');
    await page.fill('#newPassword', 'anothernewpassword999');
    await page.fill('#confirmPassword', 'anothernewpassword999');
    await page.getByRole('button', { name: /update password/i }).click();

    await expect(page.locator('.form-error')).toBeVisible();
  });

  // A token that goes invalid mid-session (expiry, server secret change)
  // used to fail silently on whichever page hit it, with the navbar still
  // showing the user as signed in. The in-app nav click matters here: a
  // full page.goto would reload the app and hit the (separate) on-load
  // path instead of the stale-session one.
  test('a token that goes invalid mid-session signs you out and redirects to login', async ({ page }) => {
    await registerNewUser(page, { name: 'Expiry Tester', prefix: 'expiry' });
    // The landing page fires its own saved-count request right after
    // sign-in. Wait for that to settle before invalidating the token —
    // otherwise it can hit the bad token first, sign us out mid-test, and
    // shift the navbar layout out from under the click below.
    await expect(page.getByText(/haven't saved a stack yet/i)).toBeVisible();
    await page.evaluate(() => localStorage.setItem('token', 'no-longer-valid'));

    await page.locator('.nav-links').getByRole('link', { name: 'history' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/session expired/i)).toBeVisible();
    await expect(page.locator('.nav-links').getByRole('link', { name: /^sign in$/i })).toBeVisible();
  });

  // The flip side, and the actual risk of the fix above: a wrong current
  // password is also a 401 on an authenticated request, but it must just
  // show an inline error — not clear the session and bounce to login.
  test('a wrong current password shows an inline error without signing you out', async ({ page }) => {
    await registerNewUser(page, { name: 'Stay Signed In', prefix: 'stay' });
    await page.goto('/profile');

    await page.fill('#currentPassword', 'definitely-wrong');
    await page.fill('#newPassword', 'anothernewpassword999');
    await page.fill('#confirmPassword', 'anothernewpassword999');
    await page.getByRole('button', { name: /update password/i }).click();

    await expect(page.locator('.form-error')).toBeVisible();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.locator('.nav-links').getByRole('link', { name: 'Stay Signed In' })).toBeVisible();
  });

  test('the profile page is protected — visiting it while signed out redirects to login', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('the history page is protected — visiting it while signed out redirects to login', async ({ page }) => {
    await page.goto('/history');
    await expect(page).toHaveURL(/\/login$/);
  });
});
