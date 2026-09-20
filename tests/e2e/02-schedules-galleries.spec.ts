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

	test('adds, edits and deletes a maintenance schedule', async ({ page }) => {
		const { vehicleId } = await gremlin();
		await page.goto(`/vehicles/${vehicleId}`);

		const panel = page.getByRole('region', { name: 'Maintenance Schedule' });
		await panel.getByRole('button', { name: 'Add', exact: true }).click();

		// A schedule needs an interval; the form refuses before the server has to.
		await panel.getByLabel('Name').fill('Journey oil change');
		await panel.getByRole('button', { name: 'Add schedule' }).click();
		await expect(
			panel.getByRole('alert').filter({ hasText: 'Set a mileage interval' })
		).toBeVisible();

		await panel.getByLabel('Every', { exact: true }).fill('5000');
		await panel.getByRole('button', { name: 'Add schedule' }).click();

		await expect(panel.getByText('Journey oil change')).toBeVisible();
		await expect(panel.getByText('Every 5,000 mi')).toBeVisible();
		const where = `from maintenance_schedules where vehicle_id = '${vehicleId}' and name = 'Journey oil change'`;
		expect(
			await sql(
				`select interval_miles || '|' || coalesce(interval_months::text, '<null>') ${where}`
			)
		).toBe('5000|<null>');

		// Edit: months instead of miles — the cleared interval must reach NULL.
		await panel.getByRole('button', { name: 'Edit Journey oil change' }).click();
		await panel.getByLabel('Every', { exact: true }).fill('');
		await panel.getByLabel('Or every').fill('6');
		await panel.getByRole('button', { name: 'Save changes' }).click();

		await expect(panel.getByText('Every 6 months')).toBeVisible();
		expect(
			await sql(
				`select coalesce(interval_miles::text, '<null>') || '|' || interval_months ${where}`
			)
		).toBe('<null>|6');

		await panel.getByRole('button', { name: 'Delete Journey oil change' }).click();
		await expect(panel.getByText('Journey oil change')).toBeHidden();
		expect(await sql(`select count(*) ${where}`)).toBe('0');
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
