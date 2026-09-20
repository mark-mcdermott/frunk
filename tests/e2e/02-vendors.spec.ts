import { expect, test } from '@playwright/test';
import { demoUser, sql } from './support';

/**
 * Vendors: the flat entity the other journeys only ever touch through a repair's
 * select. Added through the form, edited (the form must open seeded from the row, a
 * changed field must land, a cleared optional must reach NULL), then deleted through
 * the two-step confirmation — each checked in Postgres.
 */
test('adds, edits and deletes a vendor', async ({ page }) => {
	const { id: owner } = await demoUser();

	await page.goto('/vendors');
	await page.getByRole('link', { name: 'Add Vendor' }).click();
	await page.getByLabel('Name').fill('Journey Tire & Lube');
	await page.getByLabel('Phone').fill('570-555-0100');
	await page.getByLabel('Address').fill('1725 Slough Ave, Scranton');
	await page.getByLabel('Website').fill('https://journeytire.example');
	await page.getByRole('button', { name: 'Add Vendor' }).click();

	await expect(page).toHaveURL(/\/vendors$/);
	await expect(page.getByRole('heading', { name: 'Journey Tire & Lube' })).toBeVisible();

	// Edit: the form opens seeded from the row; change the phone, clear the address.
	await page.getByRole('button', { name: 'Edit Journey Tire & Lube' }).click();
	await expect(page.getByRole('heading', { name: 'Edit Vendor' })).toBeVisible();
	await expect(page.getByLabel('Phone')).toHaveValue('570-555-0100');
	await page.getByLabel('Phone').fill('570-555-0199');
	await page.getByLabel('Address').fill('');
	await page.getByRole('button', { name: 'Save Changes' }).click();

	await expect(page).toHaveURL(/\/vendors$/);
	expect(
		await sql(
			`select phone || '|' || coalesce(address, '<null>') from vendors where name = 'Journey Tire & Lube' and user_id = '${owner}'`
		)
	).toBe('570-555-0199|<null>');

	// Delete, through the two-step confirmation on the edit form.
	await page.getByRole('button', { name: 'Edit Journey Tire & Lube' }).click();
	await page.getByRole('button', { name: 'Delete Vendor' }).click();
	await page.getByRole('button', { name: 'Delete permanently' }).click();

	await expect(page).toHaveURL(/\/vendors$/);
	expect(await sql(`select count(*) from vendors where name = 'Journey Tire & Lube'`)).toBe('0');
});
