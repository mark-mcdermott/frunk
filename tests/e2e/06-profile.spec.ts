import { expect, test } from '@playwright/test';
import { demoUser, sql, uploadsAvailable } from './support';

/**
 * The profile, on the shared demo account — and, last of all, its deletion. Runs last
 * by filename because nothing can use the account afterwards.
 */
test('edits the profile, swaps the avatar, and deletes the account', async ({ page }) => {
	const { id } = await demoUser();
	await page.goto('/profile');

	await page.getByLabel('Full Name').fill('Journey Tester');
	await page.getByRole('button', { name: 'Save Changes' }).click();
	await expect(page.getByText('Saved')).toBeVisible();
	// Better Auth's endpoint refreshes the session store, so the header follows at once.
	await expect(page.getByRole('link', { name: 'Your profile (Journey Tester)' })).toBeVisible();

	if (uploadsAvailable) {
		await page.getByLabel('Profile photo', { exact: true }).setInputFiles('tests/e2e/fixtures/pixel.png');
		await expect(page.locator('header img')).toHaveAttribute('src', /^\/api\/files\/u\//);
		await page.getByRole('button', { name: 'Remove photo' }).click();
		await expect(page.locator('header img')).toHaveCount(0);
		expect(await sql(`select image is null from "user" where id = '${id}'`)).toBe('t');
	}

	await page.getByRole('button', { name: 'Delete Account' }).click();
	await page.getByRole('button', { name: 'Delete my account permanently' }).click();

	await expect(page).toHaveURL(/\/$/);
	expect(await sql(`select count(*) from "user" where id = '${id}'`)).toBe('0');
	expect(await sql(`select count(*) from session where user_id = '${id}'`)).toBe('0');
});
