import { expect, test } from '@playwright/test';

test.describe('Merch Store', () => {
	test('merch page loads with products', async ({ page }) => {
		await page.goto('/merch');
		await expect(page.locator('h1')).toContainText('Merch');
		// Should show at least one product card
		await expect(page.locator('.grid a[href^="/merch/"]').first()).toBeVisible();
	});

	test('product cards show name and price', async ({ page }) => {
		await page.goto('/merch');
		const firstProduct = page.locator('.grid a[href^="/merch/"]').first();
		// Each product card has an h2 and a price
		await expect(firstProduct.locator('h2')).toBeVisible();
		await expect(firstProduct.locator('text=$')).toBeVisible();
	});

	test('clicking a product navigates to detail page', async ({ page }) => {
		await page.goto('/merch');
		const firstProduct = page.locator('.grid a[href^="/merch/"]').first();
		await firstProduct.click();
		await page.waitForURL(/\/merch\/.+/);
		// Detail page should show product name and price
		await expect(page.locator('h1')).toBeVisible();
	});

	test('product detail page shows size and color options', async ({ page }) => {
		await page.goto('/merch');
		await page.locator('.grid a[href^="/merch/"]').first().click();
		await page.waitForURL(/\/merch\/.+/);
		// Should have some selectable options (buttons or selectors for size/color)
		await expect(page.locator('button').first()).toBeVisible();
	});

	test('merch store is accessible without authentication', async ({ page }) => {
		const response = await page.goto('/merch');
		expect(response?.status()).toBe(200);
	});
});
