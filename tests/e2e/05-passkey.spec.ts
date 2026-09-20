import { expect, test } from '@playwright/test';
import { attachVirtualAuthenticator, BASE, sql, startDemo } from './support';

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

	await page.goto('/profile');
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
	// Hold on to the exact assertion the browser is about to send; it is replayed below.
	const assertion = page.waitForRequest(
		(request) =>
			request.method() === 'POST' &&
			request.url().endsWith('/api/auth/passkey/verify-authentication')
	);
	await page.getByRole('button', { name: 'Use a passkey' }).click();

	await expect(page).toHaveURL(/\/vehicles$/);
	await expect(page.getByRole('heading', { name: '1974 AMC Gremlin' })).toBeVisible();

	const session = await (await page.request.get('/api/auth/get-session')).json();
	expect(session?.user?.id, 'the passkey signs into the same account').toBe(user.id);

	// Decision 2's last open row: a challenge is consumed on read. The assertion that just
	// signed in, sent again verbatim, must be refused — otherwise anything that captured
	// it once holds a permanent credential.
	const replay = await page.request.post('/api/auth/passkey/verify-authentication', {
		headers: { Origin: BASE, 'content-type': 'application/json' },
		data: (await assertion).postDataJSON() as Record<string, unknown>
	});
	expect(replay.ok(), 'a replayed passkey assertion is refused').toBe(false);

	// Converted: no longer a demo, and the placeholder address is never shown as an email.
	await page.goto('/profile');
	await expect(page.getByText('This is a demo account')).toHaveCount(0);
	await expect(page.getByText('No email on file')).toBeVisible();
});
