import { expect, test } from '@playwright/test';
import { attachVirtualAuthenticator, BASE, sql, startDemo } from './support';

/**
 * Decision 5, end to end: a demo account gains an address, a name and a passkey and
 * becomes signable-into — same row, same garage — and then a password, which is what
 * lets it enrol recovery. The virtual authenticator is the only way the ceremony can be
 * exercised outside a hand held device, and it is also what lets the test read the
 * passkey back: the credential must be labelled with the address, not the placeholder.
 *
 * Its own demo account (the second of the run's budget of three): converting the
 * shared one would change what every later spec sees.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test('a demo account converts by adding a passkey and signs back in with it', async ({ page }) => {
	const { cdp, authenticatorId } = await attachVirtualAuthenticator(page);
	const { user } = await startDemo(page.request);
	const email = `kept-${Date.now()}@example.com`;

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

	// The keep step refuses to run the ceremony without an address to label it with.
	await page.getByRole('button', { name: 'Add a passkey and keep it' }).click();
	await expect(page.getByRole('alert').filter({ hasText: 'valid email' })).toBeVisible();

	await page.getByLabel('Email address').fill(email);
	await page.getByLabel('Your name').fill('Journey Keeper');
	await page.getByRole('button', { name: 'Add a passkey and keep it' }).click();
	await expect(page.getByText('Passkey added — this account is yours now')).toBeVisible();
	await expect(page.getByText(`Check your inbox at ${email}`)).toBeVisible();

	expect(await sql(`select count(*) from passkey where user_id = '${user.id}'`)).toBe('1');
	// The server-side hook promoted the account the moment the passkey registered; the
	// address and name followed, the address unverified until its link is clicked.
	expect(
		await sql(
			`select roles::text || '|' || is_anonymous || '|' || email || '|' || email_verified || '|' || name from "user" where id = '${user.id}'`
		)
	).toBe(`{2}|false|${email}|false|Journey Keeper`);
	// And the credential itself is labelled with the address, not the placeholder — both
	// the user name and the display name, which is what Android's sheet shows as its title.
	const { credentials } = await cdp.send('WebAuthn.getCredentials', { authenticatorId });
	expect(credentials.map((c) => [c.userName, c.userDisplayName])).toEqual([[email, email]]);

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

	// Converted: no longer a demo, the address on file (awaiting its link), and — with no
	// password yet — the password step where recovery would otherwise be.
	await page.goto('/profile');
	await expect(page.getByText('This is a demo account')).toHaveCount(0);
	// Shown twice — under the name, and in the email settings — so either will do.
	await expect(page.getByText(email, { exact: true }).first()).toBeVisible();
	await expect(page.getByRole('button', { name: 'Set up recovery' })).toHaveCount(0);

	await page.getByRole('button', { name: 'Set a password' }).click();
	await page.getByLabel('New password').fill('a-password-chosen-after-keeping');
	await page.getByRole('button', { name: 'Save password' }).click();
	await expect(page.getByText('Password set.')).toBeVisible();
	expect(
		await sql(
			`select count(*) from account where user_id = '${user.id}' and provider_id = 'credential' and password is not null`
		)
	).toBe('1');
	// Recovery is reachable now that there is a password to confirm.
	await expect(page.getByRole('button', { name: 'Set up recovery' })).toBeVisible();
});
