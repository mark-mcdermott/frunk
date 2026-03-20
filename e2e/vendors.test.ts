import { expect, test } from '@playwright/test';
import { signUpTestUser } from './helpers';

test.describe('Vendors', () => {
	test('authenticated user can create a vendor', async ({ page }) => {
		await signUpTestUser(page, 'vendor-create');

		await page.goto('/vendors/new');
		await expect(page.locator('h3')).toContainText('Add Vendor');

		await page.fill('#name-input', 'Test Auto Shop');
		await page.fill('#phone-input', '(555) 123-4567');
		await page.fill('#address-input', '123 Main St, Austin, TX');
		await page.fill('#website-input', 'https://testauto.example.com');
		await page.getByRole('button', { name: 'Add Vendor' }).click();

		// Should redirect to vendor detail page
		await page.waitForURL(/\/vendors\/[a-z0-9-]+$/);
		await expect(page.locator('text=Test Auto Shop').first()).toBeVisible();
	});

	test('vendors list shows created vendor', async ({ page }) => {
		await signUpTestUser(page, 'vendor-list');

		// Create a vendor
		await page.goto('/vendors/new');
		await page.fill('#name-input', 'Quick Lube');
		await page.getByRole('button', { name: 'Add Vendor' }).click();
		await page.waitForURL(/\/vendors\/[a-z0-9-]+$/);

		// Check list
		await page.goto('/vendors');
		await expect(page.locator('text=Quick Lube').first()).toBeVisible();
	});

	test('user can edit a vendor', async ({ page }) => {
		await signUpTestUser(page, 'vendor-edit');

		// Create a vendor
		await page.goto('/vendors/new');
		await page.fill('#name-input', 'Old Name Auto');
		await page.getByRole('button', { name: 'Add Vendor' }).click();
		await page.waitForURL(/\/vendors\/[a-z0-9-]+$/);

		// Navigate to edit via pencil icon
		await page.getByRole('link', { name: 'Edit' }).click();
		await page.waitForURL(/\/edit$/);
		await page.fill('#name-input', 'New Name Auto');
		await page.getByRole('button', { name: 'Save Changes' }).click();
		await page.waitForURL(/\/vendors\/[a-z0-9-]+$/);

		await expect(page.locator('text=New Name Auto').first()).toBeVisible();
	});

	test('user can delete a vendor', async ({ page }) => {
		await signUpTestUser(page, 'vendor-delete');

		// Create a vendor
		await page.goto('/vendors/new');
		await page.fill('#name-input', 'Delete Me Auto');
		await page.getByRole('button', { name: 'Add Vendor' }).click();
		await page.waitForURL(/\/vendors\/[a-z0-9-]+$/);

		// Navigate to edit page and delete
		await page.getByRole('link', { name: 'Edit' }).click();
		await page.waitForURL(/\/edit$/);
		await page.getByRole('button', { name: 'Delete' }).first().click();
		await page.getByRole('button', { name: 'Delete' }).last().click();
		await page.waitForURL('/vendors');
	});

	test('vendor name is required', async ({ page }) => {
		await signUpTestUser(page, 'vendor-validation');

		await page.goto('/vendors/new');
		const nameInput = page.locator('#name-input');
		await expect(nameInput).toHaveAttribute('required', '');
	});

	test('unauthenticated user cannot access vendors', async ({ page }) => {
		const response = await page.goto('/vendors');
		const status = response?.status();
		expect(status === 401 || status === 403 || status === 302 || page.url().includes('sign-in')).toBeTruthy();
	});
});
