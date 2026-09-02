import type { Page } from '@playwright/test';

/**
 * Sign up a fresh test user and return the email used.
 * Leaves the browser authenticated and on the user's profile page.
 */
export async function signUpTestUser(page: Page, prefix = 'test'): Promise<string> {
	const email = `${prefix}-${Date.now()}@example.com`;
	const password = 'TestPassword123!';
	await page.goto('/sign-up');
	await page.fill('input[name="email"]', email);
	await page.fill('input[name="password"]', password);
	await page.getByRole('button', { name: 'Create Account' }).click();
	await page.waitForURL(/\/users\/[a-z0-9]+$/);
	return email;
}

/**
 * Sign out the current user.
 */
export async function signOut(page: Page): Promise<void> {
	const avatarTrigger = page.locator('nav .cursor-pointer').last();
	await avatarTrigger.click();
	await page.click('button:has-text("Sign Out")');
	await page.waitForURL('/');
}
