import { expect, test } from '@playwright/test';
import { generateSync } from 'otplib';
import { BASE, hydrated, sql } from './support';

/**
 * The whole Phase 3 chain, driven from the browser: password sign-in landing in the
 * applet, then TOTP recovery enrolled from the profile — the flow that was unreachable
 * until the profile screen existed. The six-digit code is generated from the secret
 * the screen shows, exactly as an authenticator app would.
 *
 * Its own account: recovery needs a password, which a demo account does not have.
 * `email_verified` is set in the database, as the API suite does — no mail is
 * delivered in a test run and relaxing the config would test a laxer app than the
 * one deployed.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test('signs in with a password and enrols TOTP recovery from the profile', async ({ page }) => {
	const email = `journey-${Date.now()}@example.com`;
	const password = 'a-sufficiently-long-test-password';

	const signup = await page.request.post('/api/auth/sign-up/email', {
		headers: { Origin: BASE },
		data: { email, password, name: 'Journey Tester' }
	});
	expect(signup.ok()).toBe(true);
	await sql(`update "user" set email_verified = true where email = '${email}'`);

	await page.goto('/signin');
	await hydrated(page);
	await page.getByLabel('Email address').fill(email);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Sign in' }).click();

	// Sign-in lands in the applet, not on the marketing page.
	await expect(page).toHaveURL(/\/vehicles$/);
	await expect(page.getByRole('heading', { name: 'No vehicles yet' })).toBeVisible();

	await page.goto('/profile');
	await page.getByRole('button', { name: 'Set up recovery' }).click();
	await page.getByLabel('Confirm your password to continue').fill(password);
	await page.getByRole('button', { name: 'Continue' }).click();

	const secretButton = page.getByRole('button', { name: 'Copy the setup code' });
	await expect(secretButton).toBeVisible();
	/*
	 * The secret's own span, not the button's textContent: that glues the sr-only
	 * "Copy the setup code" onto the secret with no space, and a base32 regex happily
	 * runs on into the "C" of "Copy" — one character too long, a different key, and
	 * an "Invalid code" that looks exactly like a server bug.
	 */
	const secret = (await secretButton.locator('span').first().textContent())?.trim() ?? '';
	expect(secret, 'the setup code is shown as base32').toMatch(/^[A-Z2-7]{16,}$/);

	await page
		.getByLabel('Six-digit code from your authenticator app')
		.fill(generateSync({ secret }));
	await page.getByRole('button', { name: 'Turn on recovery' }).click();

	await expect(page.getByText('Recovery is set up')).toBeVisible();
	expect(await sql(`select two_factor_enabled from "user" where email = '${email}'`)).toBe('t');

	// The flag rides on the session, so it survives a reload without re-enrolling.
	await page.reload();
	await expect(page.getByText('Recovery is set up')).toBeVisible();
});
