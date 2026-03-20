import { expect, test } from '@playwright/test';
import { signUpTestUser } from './helpers';

/**
 * Helper: sign up and create a vehicle. Leaves the browser on the vehicle detail page.
 */
async function createVehicle(page: import('@playwright/test').Page): Promise<void> {
	await signUpTestUser(page, 'rn');
	await page.goto('/vehicles/new');
	await page.fill('#year-input', '2023');
	await page.fill('#make-input', 'Toyota');
	await page.fill('#model-input', 'Supra');
	await page.getByRole('button', { name: 'Add Vehicle' }).click();
	await page.waitForURL(/\/vehicles\/[a-z0-9-]+$/);
	// Ensure vehicle detail page is fully loaded
	await page.waitForSelector('h1');
}

test.describe('Repairs', () => {
	test('user can add a repair to a vehicle', async ({ page }) => {
		await createVehicle(page);

		// Open repair modal
		await page.getByRole('button', { name: 'Add Repair' }).click();
		await expect(page.locator('h3:has-text("Add Repair")')).toBeVisible();

		// Fill repair form
		await page.fill('#repair-description', 'Oil change');
		await page.fill('#repair-date', '2024-01-15');
		await page.fill('#repair-mileage', '50000');
		await page.fill('#repair-cost', '75.00');

		await page.locator('form[action="?/createRepair"] button[type="submit"]').click();

		// Repair should appear on the vehicle page
		await expect(page.locator('text=Oil change').first()).toBeVisible();
	});

	test('repair appears in repairs list', async ({ page }) => {
		await createVehicle(page);

		// Add a repair
		await page.getByRole('button', { name: 'Add Repair' }).click();
		await page.fill('#repair-description', 'Brake pads');
		await page.fill('#repair-date', '2024-02-10');
		await page.locator('form[action="?/createRepair"] button[type="submit"]').click();
		await expect(page.locator('text=Brake pads').first()).toBeVisible();

		// Check repairs list page
		await page.goto('/repairs');
		await expect(page.locator('text=Brake pads').first()).toBeVisible();
	});

	test('user can view repair details', async ({ page }) => {
		await createVehicle(page);

		// Add a repair
		await page.getByRole('button', { name: 'Add Repair' }).click();
		await page.fill('#repair-description', 'Tire rotation');
		await page.fill('#repair-date', '2024-03-01');
		await page.fill('#repair-cost', '45.00');
		await page.locator('form[action="?/createRepair"] button[type="submit"]').click();

		// Click through to repair detail
		await page.locator('text=Tire rotation').first().click();
		await page.waitForURL(/\/repairs\/[a-z0-9-]+$/);
		await expect(page.locator('text=Tire rotation').first()).toBeVisible();
	});
});

test.describe('Notes', () => {
	test('user can add a note to a vehicle', async ({ page }) => {
		await createVehicle(page);

		// Open note modal
		await page.getByRole('button', { name: 'Add Note' }).click();
		await expect(page.locator('h3:has-text("Add Note")')).toBeVisible();

		// Fill note form
		await page.fill('#note-title', 'Insurance info');
		await page.fill('#note-body', 'Policy number: ABC123');

		await page.locator('form[action="?/createNote"] button[type="submit"]').click();

		// Note should appear on the vehicle page
		await expect(page.locator('text=Insurance info').first()).toBeVisible();
	});

	test('note appears in notes list', async ({ page }) => {
		await createVehicle(page);

		// Add a note
		await page.getByRole('button', { name: 'Add Note' }).click();
		await page.fill('#note-title', 'Maintenance schedule');
		await page.locator('form[action="?/createNote"] button[type="submit"]').click();
		await expect(page.locator('text=Maintenance schedule').first()).toBeVisible();

		// Check notes list page
		await page.goto('/notes');
		await expect(page.locator('text=Maintenance schedule').first()).toBeVisible();
	});

	test('user can view note details', async ({ page }) => {
		await createVehicle(page);

		// Add a note
		await page.getByRole('button', { name: 'Add Note' }).click();
		await page.fill('#note-title', 'Warranty details');
		await page.fill('#note-body', 'Expires 2027');
		await page.locator('form[action="?/createNote"] button[type="submit"]').click();

		// Click through to note detail
		await page.locator('text=Warranty details').first().click();
		await page.waitForURL(/\/notes\/[a-z0-9-]+$/);
		await expect(page.locator('text=Warranty details').first()).toBeVisible();
	});
});
