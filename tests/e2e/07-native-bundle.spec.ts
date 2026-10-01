import { expect, test } from '@playwright/test';
import { sql } from './support';

/**
 * The native bundle, rehearsed in a browser. `tests/run.sh` builds it against the test
 * server and serves it from a second port, so it is what it is on a phone: a different
 * origin from the API. Everything that only exists cross-origin is on this path — the
 * CORS preflights, the bearer token in place of a cookie, the exempted body-less
 * `DELETE`, a file fetched with the token — and a webview enforces the same rules this
 * browser does.
 *
 * What a browser cannot stand in for is the device: the passkey sheet, the share
 * sheet, the preferences store. Those are checked in the simulator.
 */
const NATIVE = process.env.TEST_NATIVE_BASE ?? 'http://localhost:4477';

// A fresh visitor on a phone-sized screen: no stored session, and the tab bar showing.
test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 390, height: 844 } });

test('signs in to a demo, works the garage and signs out, all cross-origin', async ({ page }) => {
	await page.goto(`${NATIVE}/`);

	// No session: every path is the sign-in screen, and there is no home page to go back to.
	await expect(page).toHaveURL(`${NATIVE}/signin`);
	await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Back to the home page' })).toHaveCount(0);

	// On a phone the bundle is on the device, so the screen is there with no network at
	// all — and it says so plainly when asked to do something that needs one, rather
	// than repeating the engine's "Load failed".
	await page.context().setOffline(true);
	await page.getByLabel('Email address').fill('nobody@example.com');
	await page.getByLabel('Password').fill('not-a-real-password');
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await expect(page.getByRole('alert').filter({ hasText: 'Could not reach Frunk' })).toBeVisible();
	await page.context().setOffline(false);

	await page.getByRole('button', { name: 'Explore the demo' }).click();
	await expect(page).toHaveURL(`${NATIVE}/vehicles`);
	await expect(page.getByRole('heading', { name: '1974 AMC Gremlin' })).toBeVisible();

	// The session is a token in the app's own storage, never a cookie.
	const token = await page.evaluate(() => localStorage.getItem('frunk.session-token'));
	expect(token).toBeTruthy();
	expect(await page.context().cookies()).toEqual([]);
	const owner = await sql(
		`select user_id from session where token = '${(token ?? '').split('.')[0]}'`
	);
	expect(owner).not.toBe('');

	// The seeded photos come out of the bundle itself.
	const photo = page.locator('article img').first();
	await expect(photo).toBeVisible();
	expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

	// A reload finds the stored session rather than the sign-in screen.
	await page.reload();
	await expect(page.getByRole('heading', { name: '1974 AMC Gremlin' })).toBeVisible();

	// The tab bar is how a phone moves between sections.
	const tabs = page.getByRole('navigation', { name: 'Sections' });
	await tabs.getByRole('link', { name: 'Repairs' }).click();
	await expect(page).toHaveURL(`${NATIVE}/repairs`);
	await tabs.getByRole('link', { name: 'Vehicles' }).click();

	// A write, with a JSON body and the bearer token.
	await page.getByRole('link', { name: 'Add Vehicle' }).click();
	await page.getByLabel('Year').fill('1972');
	await page.getByLabel('Make').fill('Lancia');
	await page.getByLabel('Model').fill('Fulvia');
	await page.getByRole('button', { name: 'Add Vehicle' }).click();
	await expect(page.getByRole('heading', { name: '1972 Lancia Fulvia' })).toBeVisible();
	const fulvia = `from vehicles where make = 'Lancia' and user_id = '${owner}'`;
	expect(await sql(`select count(*) ${fulvia}`)).toBe('1');

	// A generated file needs the token too, so it is fetched and handed over as bytes.
	const saved = page.waitForEvent('download');
	await page.getByRole('button', { name: 'History (PDF)' }).click();
	// The name comes from `content-disposition`, which the app can only read because
	// the CORS response says it may.
	expect((await saved).suggestedFilename()).toBe('1972-Lancia-Fulvia-history.pdf');

	// A body-less DELETE from another origin: the request the form check would refuse
	// from any origin but the site's own and the app's.
	await page.getByRole('link', { name: 'Edit Vehicle' }).click();
	await page.getByRole('button', { name: 'Delete Vehicle' }).click();
	await page.getByRole('button', { name: 'Delete permanently' }).click();
	await expect(page).toHaveURL(`${NATIVE}/vehicles`);
	expect(await sql(`select count(*) ${fulvia}`)).toBe('0');

	// Signing out forgets the token, and the garage is the sign-in screen again.
	await tabs.getByRole('link', { name: 'Profile', exact: true }).click();
	await page.getByRole('button', { name: 'Sign out' }).click();
	await expect(page).toHaveURL(`${NATIVE}/signin`);
	expect(await page.evaluate(() => localStorage.getItem('frunk.session-token'))).toBeNull();
	expect(await sql(`select count(*) from session where user_id = '${owner}'`)).toBe('0');

	await page.goto(`${NATIVE}/vehicles`);
	await expect(page).toHaveURL(`${NATIVE}/signin`);
});
