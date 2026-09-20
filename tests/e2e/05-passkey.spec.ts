import { expect, test } from '@playwright/test';
import { attachVirtualAuthenticator, sql, startDemo } from './support';

/**
 * Decision 5, end to end: a demo account gains a passkey and becomes signable-into
 * — same row, same garage. The virtual authenticator is the only way this ceremony
 * can be exercised outside a hand held device.
 *
 * Its own demo account (the second of the run's budget of three): converting the
 * shared one would change what every later spec sees.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test('a demo account converts by adding a passkey and signs back in with it', async ({ page }) => {
	await attachVirtualAuthenticator(page);
	const { user } = await startDemo(page.request);

	// Both doors a demo visitor can find lead to the profile's passkey prompt, never to
	// email sign-up — Better Auth's sign-up mints a second account, and the garage would
	// be left behind. The API suite holds the server-side refusal.
	await page.goto('/signup');
	await expect(page.getByRole('link', { name: 'Keep my data' })).toHaveAttribute(
		'href',
		'/profile'
	);
	await expect(page.getByRole('heading', { name: 'You are in a demo' })).toBeVisible();
	await page.getByRole('link', { name: 'Add a passkey on your profile' }).click();

	await expect(page).toHaveURL(/\/profile$/);
	await expect(page.getByText('This is a demo account')).toBeVisible();
	await page.getByRole('button', { name: 'Add a passkey' }).click();
	await expect(page.getByText('Passkey added — this account is yours now')).toBeVisible();
	expect(await sql(`select count(*) from passkey where user_id = '${user.id}'`)).toBe('1');
	// The server-side hook promoted the account the moment the passkey registered.
	expect(
		await sql(`select roles::text || '|' || is_anonymous from "user" where id = '${user.id}'`)
	).toBe('{2}|false');

	await page.getByRole('button', { name: 'Sign out' }).click();
	await expect(page).toHaveURL(/\/$/);

	await page.goto('/signin');
	await page.getByRole('button', { name: 'Use a passkey' }).click();

	await expect(page).toHaveURL(/\/vehicles$/);
	await expect(page.getByRole('heading', { name: '1974 AMC Gremlin' })).toBeVisible();

	const session = await (await page.request.get('/api/auth/get-session')).json();
	expect(session?.user?.id, 'the passkey signs into the same account').toBe(user.id);

	// Converted: no longer a demo, and the placeholder address is never shown as an email.
	await page.goto('/profile');
	await expect(page.getByText('This is a demo account')).toHaveCount(0);
	await expect(page.getByText('No email on file')).toBeVisible();
});
