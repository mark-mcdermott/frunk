import { expect, test } from '@playwright/test';
import { signUpTestUser, signOut } from './helpers';

// Generate unique test user credentials for each run
const testEmail = `test-${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';

test.describe('Sign Up Flow', () => {
	test('form has required fields', async ({ page }) => {
		await page.goto('/sign-up');
		// Verify form elements exist
		await expect(page.locator('input[name="email"]')).toBeVisible();
		await expect(page.locator('input[name="password"]')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
		// Email input should have type="email" for validation
		await expect(page.locator('input[name="email"]')).toHaveAttribute('type', 'email');
	});

	test('form shows link to sign in', async ({ page }) => {
		await page.goto('/sign-up');
		// Look for the specific form link (not the navbar one)
		await expect(page.getByRole('link', { name: 'Sign in.' })).toBeVisible();
	});

	test('successful sign up redirects to profile', async ({ page }) => {
		await page.goto('/sign-up');
		await page.fill('input[name="email"]', testEmail);
		await page.fill('input[name="password"]', testPassword);
		await page.getByRole('button', { name: 'Create Account' }).click();
		// Should redirect to user profile page
		await page.waitForURL(/\/users\/[a-z0-9]+$/);
		// Should show email verification banner
		await expect(page.locator('text=Email not verified')).toBeVisible();
	});
});

test.describe('Sign In Flow', () => {
	test('shows error for invalid credentials', async ({ page }) => {
		await page.goto('/sign-in');
		await page.fill('input[name="email"]', 'nonexistent@example.com');
		await page.fill('input[name="password"]', 'wrongpassword');
		await page.getByRole('button', { name: 'Sign In' }).click();
		// Should show error message (actual message is "Incorrect email or password")
		await expect(page.locator('text=Incorrect email or password')).toBeVisible();
	});

	test('successful sign in redirects appropriately', async ({ page }) => {
		// First create a user by signing up
		const loginEmail = await signUpTestUser(page, 'login');

		// Sign out
		await signOut(page);

		// Now sign in
		await page.goto('/sign-in');
		await page.fill('input[name="email"]', loginEmail);
		await page.fill('input[name="password"]', testPassword);
		await page.getByRole('button', { name: 'Sign In' }).click();
		// Should redirect to vehicles page after login
		await page.waitForURL('/vehicles');
	});
});

test.describe('User Profile', () => {
	test('authenticated user can view own profile', async ({ page }) => {
		const profileEmail = await signUpTestUser(page, 'profile');

		// Should see username on profile
		await expect(page.locator(`text=${profileEmail}`)).toBeVisible();
	});

	test('authenticated user can access edit page', async ({ page }) => {
		const editEmail = await signUpTestUser(page, 'edit');

		// Get the user UUID from URL
		const url = page.url();
		const uuid = url.split('/users/')[1];

		// Navigate to edit page
		await page.goto(`/users/${uuid}/edit`);
		await expect(page.locator('input[name="username"]')).toBeVisible();
		await expect(page.locator('input[name="username"]')).toHaveValue(editEmail);
	});

	test('unauthenticated user cannot access user profiles', async ({ page }) => {
		// Try to access a random user profile without being logged in
		const response = await page.goto('/users/randomuuid123');
		// Should get 401 or redirect to sign-in
		const status = response?.status();
		expect(status === 401 || page.url().includes('sign-in') || status === 404).toBeTruthy();
	});
});

test.describe('Sign Out', () => {
	test('user can sign out', async ({ page }) => {
		await signUpTestUser(page, 'signout');

		// Sign out using helper
		await signOut(page);

		// Should be on home and show sign in button
		await expect(page.locator('a[href="/sign-in"]')).toBeVisible();
	});
});

test.describe('Protected Routes', () => {
	test('users index page requires admin', async ({ page }) => {
		await signUpTestUser(page, 'regular');

		// Try to access users list
		const response = await page.goto('/users');
		// Should get 403 or similar
		const status = response?.status();
		expect(status === 403 || status === 401).toBeTruthy();
	});

	test('user cannot view other user profiles', async ({ page }) => {
		await signUpTestUser(page, 'user1');

		// Try to access another user's profile (random UUID)
		const response = await page.goto('/users/anotheruseruuid123');
		const status = response?.status();
		// Should be forbidden (403) or not found (404)
		expect(status === 403 || status === 404).toBeTruthy();
	});
});
