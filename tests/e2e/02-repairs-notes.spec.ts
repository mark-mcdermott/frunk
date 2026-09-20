import { expect, test } from '@playwright/test';
import { sql, uploadsAvailable } from './support';

/**
 * A repair logged from the vehicle screen, a note with a real file attached to that
 * repair, both details rendered, both deleted. The upload steps need the store token
 * and skip without it — visibly.
 */
test('logs a repair on a vehicle, attaches a note, and cleans up', async ({ page }) => {
	await page.goto('/vehicles');
	await page.getByRole('link', { name: '1974 AMC Gremlin', exact: true }).click();
	await page.getByRole('link', { name: 'Add Repair' }).click();

	await page.getByLabel('Description').fill('Journey strut replacement');
	await page.getByLabel('Cost').fill('89.99');
	await page.getByRole('button', { name: 'Add Repair' }).click();

	await expect(page).toHaveURL(/\/repairs\/[0-9a-f-]{36}$/);
	await expect(page.getByRole('heading', { name: 'Journey strut replacement' })).toBeVisible();
	await expect(page.getByText('$89.99')).toBeVisible();
	// Dollars typed, cents stored.
	expect(
		await sql(`select cost from repairs where description = 'Journey strut replacement'`)
	).toBe('8999');
	const repairUrl = page.url();

	// Edit: the form opens seeded from the row, and a changed cost lands in cents.
	await page.getByRole('link', { name: 'Edit', exact: true }).click();
	await expect(page.getByLabel('Description')).toHaveValue('Journey strut replacement');
	await page.getByLabel('Cost').fill('120.5');
	await page.getByRole('button', { name: 'Save Changes' }).click();
	await expect(page).toHaveURL(repairUrl);
	await expect(page.getByText('$120.50')).toBeVisible();
	expect(
		await sql(`select cost from repairs where description = 'Journey strut replacement'`)
	).toBe('12050');

	await page.getByRole('link', { name: 'Add Note' }).click();
	await expect(page.getByRole('link', { name: 'this repair' })).toBeVisible();
	await page.getByLabel('Title').fill('Journey receipt');
	await page.getByLabel('Note (optional)').fill('OEM parts, lifetime warranty.');
	if (uploadsAvailable) {
		await page
			.getByLabel('Attachment', { exact: true })
			.setInputFiles('tests/e2e/fixtures/receipt.pdf');
		await expect(page.getByRole('link', { name: 'View attachment' })).toBeVisible();
	}
	await page.getByRole('button', { name: 'Add Note' }).click();

	// Lands back on the repair, where repair-attached notes surface — nowhere else does.
	await expect(page).toHaveURL(repairUrl);
	await expect(page.getByRole('heading', { name: 'Journey receipt' })).toBeVisible();

	await page.getByRole('link', { name: 'Journey receipt', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Journey receipt' })).toBeVisible();
	if (uploadsAvailable) {
		await expect(page.getByRole('link', { name: 'Open the PDF' })).toBeVisible();
		expect(await sql(`select image_url from notes where title = 'Journey receipt'`)).toMatch(
			/^\/api\/files\/u\//
		);
	}

	// Edit: seeded from the row; a repair-attached note returns to its repair on save.
	await page.getByRole('link', { name: 'Edit', exact: true }).click();
	await expect(page.getByLabel('Title')).toHaveValue('Journey receipt');
	await page.getByLabel('Title').fill('Journey receipt (paid)');
	await page.getByRole('button', { name: 'Save Changes' }).click();
	await expect(page).toHaveURL(repairUrl);
	expect(await sql(`select count(*) from notes where title = 'Journey receipt (paid)'`)).toBe('1');

	await page.getByRole('link', { name: 'Journey receipt (paid)', exact: true }).click();
	await page.getByRole('button', { name: 'Delete', exact: true }).click();
	await page.getByRole('button', { name: 'Delete permanently' }).click();
	await expect(page).toHaveURL(/\/notes$/);
	expect(await sql(`select count(*) from notes where title = 'Journey receipt (paid)'`)).toBe('0');

	await page.goto(`${repairUrl}/edit`);
	await page.getByRole('button', { name: 'Delete Repair' }).click();
	await page.getByRole('button', { name: 'Delete permanently' }).click();
	await expect(page).toHaveURL(/\/repairs$/);
	expect(
		await sql(`select count(*) from repairs where description = 'Journey strut replacement'`)
	).toBe('0');
});
