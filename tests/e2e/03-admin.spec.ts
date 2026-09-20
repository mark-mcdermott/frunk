import { expect, test } from '@playwright/test';
import { demoUser, sql } from './support';

/**
 * The admin screens, seen from both sides of the role. The nav entry is presentation
 * only, so the check that matters is the API's 403 rendering for a non-admin — then
 * the same account promoted in the database and the list, search and edit working.
 */
test.describe('user admin', () => {
	test('a non-admin sees no entry and gets the 403 rendered', async ({ page }) => {
		await page.goto('/vehicles');
		await expect(page.getByRole('navigation', { name: 'Sections' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);

		await page.goto('/users');
		await expect(page.getByRole('alert')).toHaveText('Forbidden');
	});

	test('an admin lists, searches and edits users', async ({ page }) => {
		const { id } = await demoUser();
		await sql(`update "user" set roles = '{1,3}' where id = '${id}'`);

		try {
			await page.goto('/vehicles');
			await page
				.getByRole('navigation', { name: 'Sections' })
				.getByRole('link', { name: 'Users' })
				.click();

			await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
			await expect(page.getByText(/Showing 1 to \d+ of \d+ users/)).toBeVisible();

			await page.getByLabel('Search users').fill('schrute');
			await expect(page.getByText('Showing 1 to 1 of 1 user')).toBeVisible();

			await page.getByRole('button', { name: 'Edit dwight.schrute' }).click();
			await page.getByLabel('Full Name').fill('Dwight K. Schrute');
			await page.getByRole('button', { name: 'Save Changes' }).click();

			await expect(page).toHaveURL(/\/users$/);
			expect(
				await sql(`select name from "user" where email = 'dwight.schrute@dundermifflin.com'`)
			).toBe('Dwight K. Schrute');

			// Your own row: no delete here — that belongs to the profile screen.
			await page.goto(`/users/${id}/edit`);
			await expect(page.getByText('This is your account')).toBeVisible();
			await expect(page.getByRole('button', { name: 'Delete User' })).toHaveCount(0);
		} finally {
			await sql(`update "user" set roles = '{1}' where id = '${id}'`);
		}
	});
});
