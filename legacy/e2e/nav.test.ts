import { expect, test } from '@playwright/test';

test.describe('Navigation', () => {
	test('home page loads with logo and navigation', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('h1')).toBeVisible();
		await expect(page.locator('nav')).toBeVisible();
		// Logo should be visible
		await expect(page.locator('nav img[alt="Logo"]')).toBeVisible();
	});

	test('sign in page is accessible', async ({ page }) => {
		await page.goto('/sign-in');
		await expect(page.locator('h3')).toContainText('Sign In');
		await expect(page.locator('input[name="email"]')).toBeVisible();
		await expect(page.locator('input[name="password"]')).toBeVisible();
	});

	test('sign up page is accessible', async ({ page }) => {
		await page.goto('/sign-up');
		await expect(page.locator('h3')).toContainText('Create Account');
		await expect(page.locator('input[name="email"]')).toBeVisible();
		await expect(page.locator('input[name="password"]')).toBeVisible();
	});

	test('store/merch page is accessible', async ({ page }) => {
		await page.goto('/store');
		await expect(page.locator('nav').first()).toBeVisible();
	});

	test('nav sign in button links to sign-in page', async ({ page }) => {
		await page.goto('/');
		await page.click('a[href="/sign-in"]');
		await expect(page).toHaveURL('/sign-in');
	});
});
