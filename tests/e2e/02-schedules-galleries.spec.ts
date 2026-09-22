import { expect, test } from '@playwright/test';
import { blobExists, demoUser, sql, uploadsAvailable } from './support';

/**
 * The two records edited in place on the vehicle detail screen rather than on a route
 * of their own: maintenance schedules and galleries. Same rules as the garage — every
 * step is checked in Postgres afterwards — plus one more for photos: the bytes are
 * checked in the blob store, because a deleted photo whose file lingers is exactly the
 * orphan the endpoints promise not to leave.
 */
test.describe('vehicle detail', () => {
	async function gremlin(): Promise<{ owner: string; vehicleId: string }> {
		const { id: owner } = await demoUser();
		const vehicleId = await sql(
			`select id from vehicles where user_id = '${owner}' and model = 'Gremlin'`
		);
		return { owner, vehicleId };
	}

	test('adds, marks done, edits and deletes a maintenance schedule', async ({ page }) => {
		const { vehicleId } = await gremlin();
		await page.goto(`/vehicles/${vehicleId}`);

		const panel = page.getByRole('region', { name: 'Maintenance Schedule' });

		// The seed gives every car one schedule in each state; the pills are the verdicts.
		await expect(panel.getByText(/^Overdue by/)).toBeVisible();
		await expect(panel.getByText(/^Due (in|today)/)).toBeVisible();
		await expect(panel.getByText(/^Next /)).toBeVisible();
		await expect(panel.getByText(/^Not started/)).toBeVisible();

		await panel.getByRole('button', { name: 'Add', exact: true }).click();

		// A template prefills every field; nothing about it is locked.
		await panel.getByRole('button', { name: 'Oil change', exact: true }).click();
		await expect(panel.getByLabel('Name')).toHaveValue('Oil change');
		await expect(panel.getByLabel('Every', { exact: true })).toHaveValue('5000');
		await expect(panel.getByLabel('Or every')).toHaveValue('6');

		// A schedule needs an interval; the form refuses before the server has to.
		await panel.getByLabel('Name').fill('Journey oil change');
		await panel.getByLabel('Every', { exact: true }).fill('');
		await panel.getByLabel('Or every').fill('');
		await panel.getByRole('button', { name: 'Add schedule' }).click();
		await expect(
			panel.getByRole('alert').filter({ hasText: 'Set a mileage interval' })
		).toBeVisible();

		await panel.getByLabel('Every', { exact: true }).fill('5000');
		await panel.getByRole('button', { name: 'Add schedule' }).click();

		await expect(panel.getByText('Journey oil change')).toBeVisible();
		await expect(panel.getByText('Every 5,000 mi', { exact: true })).toBeVisible();
		const where = `from maintenance_schedules where vehicle_id = '${vehicleId}' and name = 'Journey oil change'`;
		expect(
			await sql(
				`select interval_miles || '|' || coalesce(interval_months::text, '<null>') ${where}`
			)
		).toBe('5000|<null>');
		const scheduleId = await sql(`select id ${where}`);

		// Mark done: last done moves, the odometer follows, and a repair is written.
		await panel.getByRole('button', { name: 'Mark Journey oil change done' }).click();
		const done = panel.getByRole('form', { name: 'Mark Journey oil change done' });
		await expect(done.getByLabel('Mileage')).toHaveValue('84200');
		await done.getByLabel('Mileage').fill('90000');
		await done.getByLabel('Cost').fill('45');
		await done.getByRole('button', { name: 'Save' }).click();

		await expect(panel.getByText('Next at 95,000 mi')).toBeVisible();
		await expect(panel.getByText('Last done', { exact: false })).toHaveCount(4);
		expect(await sql(`select last_completed_mileage ${where}`)).toBe('90000');
		expect(await sql(`select current_mileage from vehicles where id = '${vehicleId}'`)).toBe(
			'90000'
		);
		const repairs = `from repairs where schedule_id = '${scheduleId}'`;
		expect(
			await sql(`select description || '|' || mileage || '|' || cost || '|' || status ${repairs}`)
		).toBe('Journey oil change|90000|4500|completed');
		await expect(
			page.getByRole('region', { name: 'Repairs' }).getByText('Journey oil change')
		).toBeVisible();

		// Edit: months instead of miles — the cleared interval must reach NULL.
		await panel.getByRole('button', { name: 'Edit Journey oil change' }).click();
		await panel.getByLabel('Every', { exact: true }).fill('');
		await panel.getByLabel('Or every').fill('6');
		await panel.getByRole('button', { name: 'Save changes' }).click();

		await expect(panel.getByText('Every 6 months', { exact: true })).toBeVisible();
		expect(
			await sql(
				`select coalesce(interval_miles::text, '<null>') || '|' || interval_months ${where}`
			)
		).toBe('<null>|6');

		// The schedule goes; the service it logged stays in the history, unlinked.
		await panel.getByRole('button', { name: 'Delete Journey oil change' }).click();
		await expect(panel.getByText('Journey oil change')).toBeHidden();
		expect(await sql(`select count(*) ${where}`)).toBe('0');
		expect(
			await sql(
				`select coalesce(schedule_id, '<null>') from repairs where vehicle_id = '${vehicleId}' and description = 'Journey oil change'`
			)
		).toBe('<null>');
	});

	test('creates a gallery, adds and removes photos, and deletes it', async ({ page }) => {
		const { owner, vehicleId } = await gremlin();
		await page.goto(`/vehicles/${vehicleId}`);

		const panel = page.getByRole('region', { name: 'Galleries' });
		await panel.getByRole('button', { name: 'Add Gallery' }).click();

		await panel.getByRole('button', { name: 'Create gallery' }).click();
		await expect(panel.getByRole('alert').filter({ hasText: 'Name is required' })).toBeVisible();

		await panel.getByLabel('Gallery name').fill('Journey exterior');
		await panel.getByRole('button', { name: 'Create gallery' }).click();

		// The seeded galleries have their own "Add photo" inputs; this one is a region of
		// its own, named by its heading, so nothing below can land on the wrong gallery.
		const gallery = panel.getByRole('region', { name: 'Journey exterior' });
		await expect(gallery).toBeVisible();
		const galleryId = await sql(
			`select id from galleries where vehicle_id = '${vehicleId}' and name = 'Journey exterior'`
		);
		expect(galleryId).toMatch(/^[0-9a-f-]{36}$/);

		if (uploadsAvailable) {
			// Two photos: one is deleted on its own, the other goes with the gallery, so
			// both blob-cleanup paths run.
			for (const count of [1, 2]) {
				await gallery.getByLabel('Add photo').setInputFiles('tests/e2e/fixtures/pixel.png');
				await expect(gallery.locator('img')).toHaveCount(count);
			}

			const photos = `select image_url from vehicle_photos where gallery_id = '${galleryId}'`;
			const urls = (await sql(photos)).split('\n');
			expect(urls).toHaveLength(2);
			for (const url of urls) {
				expect(url).toMatch(new RegExp(`^/api/files/u/${owner}/`));
				expect(await blobExists(url)).toBe(true);
			}

			// The bytes come back only through the session, and only to their owner.
			const served = await page.request.get(urls[0] ?? '');
			expect(served.status()).toBe(200);
			expect(served.headers()['content-type']).toBe('image/png');
			expect(served.headers()['cache-control']).toContain('private');

			// Delete whichever photo renders first (newest first, so not the order above):
			// its row goes, its blob goes, and the other photo's blob is untouched.
			await gallery.getByRole('button', { name: 'Delete photo' }).first().click();
			await expect(gallery.locator('img')).toHaveCount(1);
			const kept = await sql(photos);
			const removed = urls.find((url) => url !== kept) ?? '';
			expect(removed).not.toBe('');
			await expect.poll(() => blobExists(removed), { timeout: 10_000 }).toBe(false);
			expect(await blobExists(kept)).toBe(true);

			// Deleting the gallery cascades the last row, and its blob has to go too.
			await gallery.getByRole('button', { name: 'Delete gallery Journey exterior' }).click();
			await gallery.getByRole('button', { name: 'Delete gallery and 1 photo' }).click();
			await expect(gallery).toBeHidden();
			expect(
				await sql(`select count(*) from vehicle_photos where gallery_id = '${galleryId}'`)
			).toBe('0');
			await expect.poll(() => blobExists(kept), { timeout: 10_000 }).toBe(false);
		} else {
			await gallery.getByRole('button', { name: 'Delete gallery Journey exterior' }).click();
			await gallery.getByRole('button', { name: 'Delete gallery and 0 photos' }).click();
			await expect(gallery).toBeHidden();
		}

		expect(await sql(`select count(*) from galleries where id = '${galleryId}'`)).toBe('0');
	});
});
