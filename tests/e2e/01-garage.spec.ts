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

		// A car with no dates is nudged rather than shown an empty list.
		await expect(page.getByText('No renewal dates yet')).toBeVisible();

		// Edit: clear the nickname, set a colour — the cleared field must reach NULL —
		// and give the registration a date ten days out, which makes it a reminder.
		const inTenDays = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
		const ymd = `${inTenDays.getFullYear()}-${String(inTenDays.getMonth() + 1).padStart(2, '0')}-${String(inTenDays.getDate()).padStart(2, '0')}`;
		await page.getByRole('link', { name: 'Edit Vehicle' }).click();
		await page.getByLabel('Nickname').fill('');
		await page.getByLabel('Color').fill('Red');
		await page.getByLabel('Registration expires').fill(ymd);
		await page.getByRole('button', { name: 'Save Changes' }).click();

		await expect(page.getByRole('heading', { name: '1987 Toyota MR2' })).toBeVisible();
		await expect(page.getByText('Expires in 10 days')).toBeVisible();
		expect(
			await sql(
				`select coalesce(nickname, '<null>') || '|' || color || '|' || registration_expiration::date from vehicles where make = 'Toyota' and user_id = '${owner}'`
			)
		).toBe(`<null>|Red|${ymd}`);

		// The history downloads are real files, named for the car.
		const pdf = page.waitForEvent('download');
		await page.getByRole('link', { name: 'History (PDF)' }).click();
		const report = await pdf;
		expect(report.suggestedFilename()).toBe('1987-Toyota-MR2-history.pdf');
		const stream = await report.createReadStream();
		const head = await new Promise<string>((resolve) => {
			stream.once('data', (chunk: Buffer) => {
				resolve(chunk.subarray(0, 5).toString());
				stream.destroy();
			});
		});
		expect(head).toBe('%PDF-');

		const csv = page.waitForEvent('download');
		await page.getByRole('link', { name: 'Repairs (CSV)' }).click();
		expect((await csv).suggestedFilename()).toBe('1987-Toyota-MR2-history.csv');

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
