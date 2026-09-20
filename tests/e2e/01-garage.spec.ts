import { expect, test } from '@playwright/test';
import { demoUser, sql } from './support';

/**
 * The garage: the seeded demo vehicles, search, and full vehicle CRUD through the
 * real forms — then the column values checked in Postgres, because "the screen said
 * so" is not the same as "it was stored that way" (a cleared optional must be NULL,
 * not '').
 */
test.describe('garage', () => {
	test('lists the cloned demo vehicles and filters them', async ({ page }) => {
		await page.goto('/vehicles');

		await expect(page.getByRole('heading', { name: 'My Vehicles' })).toBeVisible();
		for (const title of ['1974 AMC Gremlin', '1976 Ford Pinto', '1965 Chevrolet Corvair']) {
			await expect(page.getByRole('heading', { name: title })).toBeVisible();
		}

		await page.getByLabel('Search vehicles').fill('pinto');
		await expect(page.getByRole('heading', { name: '1976 Ford Pinto' })).toBeVisible();
		await expect(page.getByRole('heading', { name: '1974 AMC Gremlin' })).toBeHidden();
	});

	test('adds, edits and deletes a vehicle', async ({ page }) => {
		// The seed has other owners' cars; every database check is scoped to this account.
		const { id: owner } = await demoUser();
		await page.goto('/vehicles');
		await page.getByRole('link', { name: 'Add Vehicle' }).click();

		// Validation fires before any request.
		await page.getByRole('button', { name: 'Add Vehicle' }).click();
		await expect(page.getByRole('alert').filter({ hasText: 'Year is required' })).toBeVisible();

		await page.getByLabel('Year').fill('1987');
		await page.getByLabel('Make').fill('Toyota');
		await page.getByLabel('Model').fill('MR2');
		await page.getByLabel('Nickname').fill('Journey MR2');
		await page.getByRole('button', { name: 'Add Vehicle' }).click();

		await expect(page).toHaveURL(/\/vehicles\/[0-9a-f-]{36}$/);
		await expect(page.getByRole('heading', { name: 'Journey MR2' })).toBeVisible();

		// Edit: clear the nickname, set a colour — the cleared field must reach NULL.
		await page.getByRole('link', { name: 'Edit Vehicle' }).click();
		await page.getByLabel('Nickname').fill('');
		await page.getByLabel('Color').fill('Red');
		await page.getByRole('button', { name: 'Save Changes' }).click();

		await expect(page.getByRole('heading', { name: '1987 Toyota MR2' })).toBeVisible();
		expect(
			await sql(
				`select coalesce(nickname, '<null>') || '|' || color from vehicles where make = 'Toyota' and user_id = '${owner}'`
			)
		).toBe('<null>|Red');

		// Delete, through the two-step confirmation.
		await page.getByRole('link', { name: 'Edit Vehicle' }).click();
		await page.getByRole('button', { name: 'Delete Vehicle' }).click();
		await page.getByRole('button', { name: 'Delete permanently' }).click();

		await expect(page).toHaveURL(/\/vehicles$/);
		await expect(page.getByRole('heading', { name: '1987 Toyota MR2' })).toBeHidden();
		expect(
			await sql(`select count(*) from vehicles where make = 'Toyota' and user_id = '${owner}'`)
		).toBe('0');
	});
});
