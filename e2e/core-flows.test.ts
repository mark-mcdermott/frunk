import { expect, test } from '@playwright/test';

// Generate unique test user credentials for each run
const testEmail = `test-${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';

test.describe('Navigation', () => {
	test('home page loads with logo and navigation', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('h1')).toBeVisible();
		await expect(page.locator('nav')).toBeVisible();
		// Logo should be visible
		await expect(page.locator('nav img[alt="Logo"]')).toBeVisible();
	});

	test('sign in page is accessible', async ({ page }) => {
		await page.goto('/sign-in');
		await expect(page.locator('h3')).toContainText('Sign In');
		await expect(page.locator('input[name="username"]')).toBeVisible();
		await expect(page.locator('input[name="password"]')).toBeVisible();
	});

	test('sign up page is accessible', async ({ page }) => {
		await page.goto('/sign-up');
		await expect(page.locator('h3')).toContainText('Create Account');
		await expect(page.locator('input[name="username"]')).toBeVisible();
		await expect(page.locator('input[name="password"]')).toBeVisible();
	});

	test('blocks page is accessible', async ({ page }) => {
		await page.goto('/blocks');
		// Use first() to handle multiple nav elements (main nav + breadcrumb nav)
		await expect(page.locator('nav').first()).toBeVisible();
	});

	test('store/merch page is accessible', async ({ page }) => {
		await page.goto('/store');
		await expect(page.locator('nav').first()).toBeVisible();
	});

	test('nav sign in button links to sign-in page', async ({ page }) => {
		await page.goto('/');
		await page.click('a[href="/sign-in"]');
		await expect(page).toHaveURL('/sign-in');
	});
});

test.describe('Sign Up Flow', () => {
	test('form has required fields', async ({ page }) => {
		await page.goto('/sign-up');
		// Verify form elements exist
		await expect(page.locator('input[name="username"]')).toBeVisible();
		await expect(page.locator('input[name="password"]')).toBeVisible();
		await expect(page.locator('button[type="submit"]')).toBeVisible();
		// Email input should have type="email" for validation
		await expect(page.locator('input[name="username"]')).toHaveAttribute('type', 'email');
	});

	test('form shows link to sign in', async ({ page }) => {
		await page.goto('/sign-up');
		// Look for the specific form link (not the navbar one)
		await expect(page.getByRole('link', { name: 'Sign in.' })).toBeVisible();
	});

	test('successful sign up redirects to profile', async ({ page }) => {
		await page.goto('/sign-up');
		await page.fill('input[name="username"]', testEmail);
		await page.fill('input[name="password"]', testPassword);
		await page.click('button[type="submit"]');
		// Should redirect to user profile page
		await page.waitForURL(/\/users\/[a-z0-9]+$/);
		// Should show email verification banner
		await expect(page.locator('text=Email not verified')).toBeVisible();
	});
});

test.describe('Sign In Flow', () => {
	test('shows error for invalid credentials', async ({ page }) => {
		await page.goto('/sign-in');
		await page.fill('input[name="username"]', 'nonexistent@example.com');
		await page.fill('input[name="password"]', 'wrongpassword');
		await page.click('button[type="submit"]');
		// Should show error message (actual message is "Incorrect email or password")
		await expect(page.locator('text=Incorrect email or password')).toBeVisible();
	});

	test('successful sign in redirects appropriately', async ({ page }) => {
		// First create a user by signing up
		const loginEmail = `login-${Date.now()}@example.com`;
		await page.goto('/sign-up');
		await page.fill('input[name="username"]', loginEmail);
		await page.fill('input[name="password"]', testPassword);
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/users\/[a-z0-9]+$/);

		// Sign out
		await page.click('[data-testid="avatar-menu"], .cursor-pointer:has(img[alt="Avatar"]), .cursor-pointer:has(.preset-filled-primary-500)');
		await page.click('text=Sign Out');
		await page.waitForURL('/');

		// Now sign in
		await page.goto('/sign-in');
		await page.fill('input[name="username"]', loginEmail);
		await page.fill('input[name="password"]', testPassword);
		await page.click('button[type="submit"]');
		// Should redirect to user profile
		await page.waitForURL(/\/users\/[a-z0-9]+$/);
	});
});

test.describe('User Profile', () => {
	test('authenticated user can view own profile', async ({ page }) => {
		// Sign up a new user
		const profileEmail = `profile-${Date.now()}@example.com`;
		await page.goto('/sign-up');
		await page.fill('input[name="username"]', profileEmail);
		await page.fill('input[name="password"]', testPassword);
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/users\/([a-z0-9]+)$/);

		// Should see username on profile
		await expect(page.locator(`text=${profileEmail}`)).toBeVisible();
	});

	test('authenticated user can access edit page', async ({ page }) => {
		// Sign up a new user
		const editEmail = `edit-${Date.now()}@example.com`;
		await page.goto('/sign-up');
		await page.fill('input[name="username"]', editEmail);
		await page.fill('input[name="password"]', testPassword);
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/users\/([a-z0-9]+)$/);

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
		// Sign up
		const signoutEmail = `signout-${Date.now()}@example.com`;
		await page.goto('/sign-up');
		await page.fill('input[name="username"]', signoutEmail);
		await page.fill('input[name="password"]', testPassword);
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/users\/[a-z0-9]+$/);

		// Open user menu and sign out
		// Click on the avatar/user menu trigger
		const avatarTrigger = page.locator('nav .cursor-pointer').last();
		await avatarTrigger.click();

		// Click sign out in the menu
		await page.click('button:has-text("Sign Out")');

		// Should redirect to home and show sign in button
		await page.waitForURL('/');
		await expect(page.locator('a[href="/sign-in"]')).toBeVisible();
	});
});

test.describe('Protected Routes', () => {
	test('users index page requires admin', async ({ page }) => {
		// Sign up as regular user
		const regularEmail = `regular-${Date.now()}@example.com`;
		await page.goto('/sign-up');
		await page.fill('input[name="username"]', regularEmail);
		await page.fill('input[name="password"]', testPassword);
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/users\/[a-z0-9]+$/);

		// Try to access users list
		const response = await page.goto('/users');
		// Should get 403 or similar
		const status = response?.status();
		expect(status === 403 || status === 401).toBeTruthy();
	});

	test('user cannot view other user profiles', async ({ page }) => {
		// Sign up as user
		const user1Email = `user1-${Date.now()}@example.com`;
		await page.goto('/sign-up');
		await page.fill('input[name="username"]', user1Email);
		await page.fill('input[name="password"]', testPassword);
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/users\/([a-z0-9]+)$/);

		// Try to access another user's profile (random UUID)
		const response = await page.goto('/users/anotheruseruuid123');
		const status = response?.status();
		// Should be forbidden (403) or not found (404)
		expect(status === 403 || status === 404).toBeTruthy();
	});
});
