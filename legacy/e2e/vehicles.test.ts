import { expect, test } from '@playwright/test';
import { signUpTestUser } from './helpers';

test.describe('Vehicles', () => {
	test('authenticated user can create a vehicle', async ({ page }) => {
		await signUpTestUser(page, 'vehicle-create');

		await page.goto('/vehicles/new');
		await expect(page.locator('h3')).toContainText('Add Vehicle');

		await page.fill('#year-input', '2023');
		await page.fill('#make-input', 'Toyota');
		await page.fill('#model-input', 'Camry');
		await page.fill('#vin-input', '1HGBH41JXMN109186');
		await page.getByRole('button', { name: 'Add Vehicle' }).click();

		// Should redirect to vehicle detail page
		await page.waitForURL(/\/vehicles\/[a-z0-9-]+$/);
		await expect(page.getByRole('heading', { name: /Toyota Camry/ })).toBeVisible();
	});

	test('vehicles list shows created vehicle', async ({ page }) => {
		await signUpTestUser(page, 'vehicle-list');

		// Create a vehicle first
		await page.goto('/vehicles/new');
		await page.fill('#year-input', '2022');
		await page.fill('#make-input', 'Honda');
		await page.fill('#model-input', 'Civic');
		await page.getByRole('button', { name: 'Add Vehicle' }).click();
		await page.waitForURL(/\/vehicles\/[a-z0-9-]+$/);

		// Verify vehicle was actually created by checking the detail page
		await expect(page.getByRole('heading', { name: /Honda Civic/ })).toBeVisible({ timeout: 10000 });

		// Go to vehicles list
		await page.goto('/vehicles');
		await page.waitForLoadState('networkidle');
		await expect(page.locator('text=Honda').first()).toBeVisible({ timeout: 15000 });
	});

	test('user can edit a vehicle', async ({ page }) => {
		await signUpTestUser(page, 'vehicle-edit');

		// Create a vehicle
		await page.goto('/vehicles/new');
		await page.fill('#year-input', '2021');
		await page.fill('#make-input', 'Ford');
		await page.fill('#model-input', 'Mustang');
		await page.getByRole('button', { name: 'Add Vehicle' }).click();
		await page.waitForURL(/\/vehicles\/[a-z0-9-]+$/);

		// Navigate to edit page via link on detail page
		await page.getByRole('link', { name: 'Edit Vehicle' }).click();
		await page.waitForURL(/\/edit$/);
		await expect(page.locator('#make-input')).toHaveValue('Ford');

		// Update the model
		await page.fill('#model-input', 'Bronco');
		await page.getByRole('button', { name: 'Save Changes' }).click();
		await page.waitForURL(/\/vehicles\/[a-z0-9-]+$/);

		await expect(page.getByRole('heading', { name: /Bronco/ })).toBeVisible();
	});

	test('user can delete a vehicle', async ({ page }) => {
		await signUpTestUser(page, 'vehicle-delete');

		// Create a vehicle
		await page.goto('/vehicles/new');
		await page.fill('#year-input', '2020');
		await page.fill('#make-input', 'Tesla');
		await page.fill('#model-input', 'Model 3');
		await page.getByRole('button', { name: 'Add Vehicle' }).click();
		await page.waitForURL(/\/vehicles\/[a-z0-9-]+$/);

		// Navigate to edit page and delete
		await page.getByRole('link', { name: 'Edit Vehicle' }).click();
		await page.waitForURL(/\/edit$/);
		await page.getByRole('button', { name: 'Delete' }).first().click();

		// Confirm deletion in modal
		await page.getByRole('button', { name: 'Delete' }).last().click();
		await page.waitForURL('/vehicles');
	});

	test('vehicle creation requires make and model', async ({ page }) => {
		await signUpTestUser(page, 'vehicle-validation');

		await page.goto('/vehicles/new');
		const makeInput = page.locator('#make-input');
		await expect(makeInput).toHaveAttribute('required', '');
		const modelInput = page.locator('#model-input');
		await expect(modelInput).toHaveAttribute('required', '');
	});

	test('unauthenticated user cannot access vehicles', async ({ page }) => {
		const response = await page.goto('/vehicles');
		const status = response?.status();
		expect(status === 401 || status === 403 || status === 302 || page.url().includes('sign-in')).toBeTruthy();
	});
});
