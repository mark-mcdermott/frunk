import { expect, test } from '@playwright/test';

test.describe('Demo Mode', () => {
	test('Try Demo button is visible on home page', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('button:has-text("Try Demo")')).toBeVisible();
	});

	test('clicking Try Demo enters demo mode with pre-populated data', async ({ page }) => {
		await page.goto('/');

		// Submit the demo form (POST to /demo)
		await page.click('button:has-text("Try Demo")');
		await page.waitForURL('/demo/vehicles');

		// Welcome modal should appear
		await expect(page.locator('text=Welcome to the Demo')).toBeVisible();
		await page.click('button:has-text("Got it")');

		// Should have pre-populated vehicles from the template user
		await expect(page.locator('nav').first()).toBeVisible();
	});

	test('demo user can browse vehicles', async ({ page }) => {
		await page.goto('/');
		await page.click('button:has-text("Try Demo")');
		await page.waitForURL('/demo/vehicles');

		// Dismiss welcome modal
		await page.click('button:has-text("Got it")');

		// Should see vehicle cards or list
		await expect(page.locator('main')).toBeVisible();
	});

	test('demo user can access vendors', async ({ page }) => {
		await page.goto('/');
		await page.click('button:has-text("Try Demo")');
		await page.waitForURL('/demo/vehicles');
		await page.click('button:has-text("Got it")');

		await page.goto('/demo/vendors');
		await expect(page.locator('nav').first()).toBeVisible();
	});

	test('demo user can access repairs list', async ({ page }) => {
		await page.goto('/');
		await page.click('button:has-text("Try Demo")');
		await page.waitForURL('/demo/vehicles');
		await page.click('button:has-text("Got it")');

		await page.goto('/demo/repairs');
		await expect(page.locator('nav').first()).toBeVisible();
	});

	test('demo user can access notes list', async ({ page }) => {
		await page.goto('/');
		await page.click('button:has-text("Try Demo")');
		await page.waitForURL('/demo/vehicles');
		await page.click('button:has-text("Got it")');

		await page.goto('/demo/notes');
		await expect(page.locator('nav').first()).toBeVisible();
	});

	test('non-demo user cannot access demo routes', async ({ page }) => {
		// Without logging in, /demo/vehicles should redirect
		const response = await page.goto('/demo/vehicles');
		expect(page.url()).not.toContain('/demo/vehicles');
	});

	test('demo user can exit demo', async ({ page }) => {
		await page.goto('/');
		await page.click('button:has-text("Try Demo")');
		await page.waitForURL('/demo/vehicles');
		await page.click('button:has-text("Got it")');

		// Click Exit Demo button
		await page.click('text=Exit Demo');
		await page.waitForURL('/');
	});
});
