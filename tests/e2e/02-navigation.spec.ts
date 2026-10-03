import { expect, test } from '@playwright/test';
import { demoUser, sql } from './support';

/**
 * Back on a phone, where the breadcrumbs give way to one control in the top left. It
 * used to be a link hard-wired to each form's section list, so a note opened from a
 * vehicle went "back" to every note there is (found dogfooding, 2026-10-02).
 */
test.use({ viewport: { width: 390, height: 844 } });

test('Back returns to the screen a form was opened from', async ({ page }) => {
	const { id: owner } = await demoUser();
	const vehicleId = await sql(
		`select id from vehicles where user_id = '${owner}' and model = 'Gremlin'`
	);
	const vehicleUrl = new RegExp(`/vehicles/${vehicleId}$`);

	await page.goto('/vehicles');
	await page
		.getByRole('link', { name: /Gremlin/ })
		.first()
		.click();
	await expect(page).toHaveURL(vehicleUrl);
	await expect(page.getByRole('button', { name: 'Back to Vehicles' })).toBeVisible();

	// Into the form and straight back out.
	await page.getByRole('link', { name: 'Add Note' }).click();
	await expect(page.getByRole('heading', { name: 'Add Note' })).toBeVisible();
	await page.getByRole('button', { name: 'Back to 1974 AMC Gremlin' }).click();
	await expect(page).toHaveURL(vehicleUrl);

	// Saving leaves the form out of history: Back from the vehicle is the garage list again.
	await page.getByRole('link', { name: 'Add Note' }).click();
	await expect(page.getByRole('heading', { name: 'Add Note' })).toBeVisible();
	await page.getByLabel('Title').fill('Journey back button');
	await page.getByRole('button', { name: 'Add Note' }).click();
	await expect(page).toHaveURL(vehicleUrl);
	await page.getByRole('button', { name: 'Back to Vehicles' }).click();
	await expect(page).toHaveURL(/\/vehicles$/);

	// A screen opened cold has no history, so Back goes up to its parent instead.
	const uuid = await sql(`select uuid from notes where title = 'Journey back button'`);
	await page.goto(`/notes/${uuid}`);
	await page.getByRole('button', { name: 'Back to Notes' }).click();
	await expect(page).toHaveURL(/\/notes$/);

	await sql(`delete from notes where uuid = '${uuid}'`);
});
