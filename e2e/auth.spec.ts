import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/SHaiPT/);
});

test('login link works', async ({ page }) => {
    await page.goto('/');

    // Click the login link.
    await page.getByRole('link', { name: 'Sign In' }).first().click();

    // Expects page to have a heading with the name of Installation.
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
});
