/**
 * Ported from the SvelteKit app (`legacy/src/lib/server/db/schema.ts`).
 *
 * Table and column names are unchanged so the port is a drop-in against the same
 * Postgres shape. Deviations are commented inline where they exist.
 */
import {
	bigint,
	boolean,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp
} from 'drizzle-orm/pg-core';

// Roles table - defines available roles and their mutual exclusivity
export const roles = pgTable('roles', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique(),
	mutuallyExclusiveWith: integer('mutually_exclusive_with').array() // array of role IDs that cannot coexist with this role
});

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

/**
 * Better Auth owns this table (Decision 2). Its adapter addresses columns by the
 * *property* name, and Drizzle maps properties to column names — so the snake_case
 * columns this codebase uses are free, as long as the property names match Better
 * Auth's field names exactly. Renaming a property below will break auth silently.
 *
 * `id` is text and is **the** identity. `uuid` is gone: it was a second identity
 * alongside `id serial`, and every entity's `user_id` now targets this column
 * instead (PORT-PLAN Decision 2, "Identity").
 */
export const user = pgTable('user', {
	id: text('id').primaryKey(),
	/**
	 * Required by Better Auth, which reverses the earlier call to drop it. The
	 * sign-up mock draws "Full name", so the form collects it again.
	 */
	name: text('name').notNull(),
	/** Was `username`, which held an email despite the name. */
	email: text('email').notNull().unique(),
	/** Was `email_verified integer`. Better Auth requires a boolean. */
	emailVerified: boolean('email_verified').notNull().default(false),
	/** Was `avatar`. */
	image: text('image'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
	/** Maintained by the twoFactor plugin. */
	twoFactorEnabled: boolean('two_factor_enabled').default(false),
	/**
	 * Maintained by the anonymous plugin. The `roles` array below stays authoritative
	 * for demo accounts (Decision 5) — this is Better Auth's own bookkeeping, and the
	 * two must not be allowed to disagree about who is a demo user.
	 */
	isAnonymous: boolean('is_anonymous').default(false),

	// --- frunk's own columns. Declared to Better Auth as additionalFields. ---
	roles: integer('roles').array().notNull().default([]),
	age: integer('age'),
	cookieConsent: jsonb('cookie_consent'),
	/** The maintenance digest (`/api/cron/maintenance-digest`) skips accounts that turn this off. */
	remindersByEmail: boolean('reminders_by_email').notNull().default(true)
});

/**
 * Better Auth's session. Differs from the hand-rolled one in two ways that matter:
 * the opaque token is its own column rather than being the primary key, and the row
 * records `ipAddress` / `userAgent`.
 */
export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	token: text('token').notNull().unique(),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

/**
 * Credentials per provider. Email+password lives here in `password`; a social login
 * would add a row with its own `providerId`. There was no equivalent before, because
 * the hand-rolled path had only passkeys.
 */
export const account = pgTable('account', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true, mode: 'date' }),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
		withTimezone: true,
		mode: 'date'
	}),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

/**
 * Short-lived tokens: email verification, password reset, and **WebAuthn challenges**.
 *
 * This replaces `webauthn_challenges`. Consuming a challenge on read — so a spent one
 * cannot be replayed — was a decision reasoned into the old code; it is now Better
 * Auth's behaviour and must be re-verified rather than assumed (Decision 2's
 * carry-forward table).
 */
export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

/**
 * Replaces `credentials`. Wider than the hand-rolled table: Better Auth also records
 * `deviceType`, `backedUp` (whether the passkey syncs to a cloud keychain) and
 * `aaguid` (the authenticator model).
 *
 * `counter` is still the clone detector — an authenticator reporting a counter at or
 * below the stored one has been duplicated.
 */
export const passkey = pgTable('passkey', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name'),
	publicKey: text('public_key').notNull(),
	credentialID: text('credential_id').notNull(),
	counter: integer('counter').notNull().default(0),
	deviceType: text('device_type').notNull(),
	backedUp: boolean('backed_up').notNull().default(false),
	transports: text('transports'),
	aaguid: text('aaguid'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow()
});

/**
 * Replaces `user.totp_secret` / `user.totp_enabled`.
 *
 * ⚠️ `secret` and `backupCodes` are encrypted at rest by Better Auth, with a key derived
 * from `BETTER_AUTH_SECRET` (confirmed 2026-09-19: the stored secret is ciphertext, and
 * a restart under a different secret fails decryption). A database dump alone therefore
 * cannot mint valid codes — a TOTP seed is symmetric, and a code is enough to recover
 * an account. The flip side is that `BETTER_AUTH_SECRET` can never be rotated without
 * destroying every user's recovery method.
 */
export const twoFactor = pgTable('two_factor', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	secret: text('secret').notNull(),
	backupCodes: text('backup_codes').notNull(),
	verified: boolean('verified').default(false),
	failedVerificationCount: integer('failed_verification_count').default(0),
	lockedUntil: timestamp('locked_until', { withTimezone: true, mode: 'date' })
});

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Passkey = typeof passkey.$inferSelect;

/**
 * Fixed-window counters. Kept after the Better Auth swap because it is not only an
 * auth concern: `POST /api/contact` is the one unauthenticated endpoint that can make
 * frunk send mail, and it uses this. Postgres rather than memory because serverless
 * instances do not share one.
 */
/**
 * Better Auth's own request limiter, with `rateLimit.storage: 'database'` in
 * `auth/config.ts`. Its default store is memory, which on Vercel means one counter per
 * function instance — a limit that resets whenever a new instance spins up. One row per
 * client address and path (`10.0.0.5|/sign-in/email`); Better Auth creates, bumps and
 * prunes them itself, and the field names are its defaults so nothing is mapped.
 */
export const rateLimit = pgTable('rate_limit', {
	id: text('id').primaryKey(),
	key: text('key').notNull().unique(),
	count: integer('count').notNull(),
	lastRequest: bigint('last_request', { mode: 'number' }).notNull()
});

export const authRateLimits = pgTable('auth_rate_limits', {
	key: text('key').primaryKey(),
	count: integer('count').notNull().default(0),
	windowStart: timestamp('window_start', { withTimezone: true, mode: 'date' })
		.notNull()
		.defaultNow()
});

// Store orders
export const orders = pgTable('orders', {
	id: text('id').primaryKey(),
	email: text('email').notNull(),
	userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
	stripeSessionId: text('stripe_session_id'),
	stripePaymentIntentId: text('stripe_payment_intent_id'),
	printfulOrderId: text('printful_order_id'),
	status: text('status').notNull().default('pending'), // pending, paid, processing, shipped, delivered, cancelled
	shippingAddress: jsonb('shipping_address'), // { name, address1, address2, city, state, zip, country }
	items: jsonb('items').notNull(), // [{ productId, variantId, quantity, price, printfulSyncVariantId, name, size, color }]
	subtotal: integer('subtotal').notNull(), // in cents
	shipping: integer('shipping').notNull().default(0), // in cents
	total: integer('total').notNull(), // in cents
	trackingNumber: text('tracking_number'),
	trackingUrl: text('tracking_url'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

// Vehicles
export const vehicles = pgTable('vehicles', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),

	// Basic Vehicle Info (required)
	make: text('make').notNull(),
	model: text('model').notNull(),
	year: integer('year').notNull(),

	// Basic Vehicle Info (optional)
	vin: text('vin'),
	image: text('image'),
	trim: text('trim'),
	bodyStyle: text('body_style'),
	color: text('color'),
	interiorColor: text('interior_color'),
	drivetrain: text('drivetrain'),
	transmission: text('transmission'),
	engineType: text('engine_type'),
	engineSize: text('engine_size'),
	fuelType: text('fuel_type'),

	// Ownership & Status
	nickname: text('nickname'),
	purchaseDate: timestamp('purchase_date', { withTimezone: true, mode: 'date' }),
	purchasePrice: integer('purchase_price'), // in cents
	purchaseMileage: integer('purchase_mileage'),
	currentMileage: integer('current_mileage'),
	ownershipStatus: text('ownership_status'), // owned, leased, financed
	licensePlate: text('license_plate'),
	licensePlateState: text('license_plate_state'),
	isActive: integer('is_active').default(1), // 1 = active, 0 = sold/inactive

	// Registration & Legal
	registrationExpiration: timestamp('registration_expiration', {
		withTimezone: true,
		mode: 'date'
	}),
	inspectionExpiration: timestamp('inspection_expiration', { withTimezone: true, mode: 'date' }),
	emissionsExpiration: timestamp('emissions_expiration', { withTimezone: true, mode: 'date' }),

	// Insurance
	insuranceProvider: text('insurance_provider'),
	insurancePolicyNumber: text('insurance_policy_number'),
	insuranceExpiration: timestamp('insurance_expiration', { withTimezone: true, mode: 'date' }),

	// Financial (for financed/leased)
	lienHolder: text('lien_holder'),
	loanAccountNumber: text('loan_account_number'),
	monthlyPayment: integer('monthly_payment'), // in cents
	payoffDate: timestamp('payoff_date', { withTimezone: true, mode: 'date' }),
	leaseEndDate: timestamp('lease_end_date', { withTimezone: true, mode: 'date' }),
	leaseAnnualMileage: integer('lease_annual_mileage'),

	// Maintenance Tracking
	lastOilChangeDate: timestamp('last_oil_change_date', { withTimezone: true, mode: 'date' }),
	lastOilChangeMileage: integer('last_oil_change_mileage'),
	oilChangeIntervalMiles: integer('oil_change_interval_miles'),
	tireRotationDueMileage: integer('tire_rotation_due_mileage'),
	nextServiceDueMileage: integer('next_service_due_mileage'),

	// Technical Specs
	seatingCapacity: integer('seating_capacity'),
	doors: integer('doors'),
	mpgCity: integer('mpg_city'),
	mpgHighway: integer('mpg_highway'),
	fuelTankCapacity: integer('fuel_tank_capacity'), // in tenths of gallons (e.g., 155 = 15.5 gal)
	towingCapacity: integer('towing_capacity'), // in lbs
	horsepower: integer('horsepower'),
	torque: integer('torque'),

	// Electric/Hybrid
	batteryCapacity: integer('battery_capacity'), // in kWh
	evRange: integer('ev_range'), // in miles
	chargerType: text('charger_type'),

	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;

// Vendors
export const vendors = pgTable('vendors', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	address: text('address'),
	phone: text('phone'),
	website: text('website'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;

// Repairs
export const repairs = pgTable('repairs', {
	id: text('id').primaryKey(),
	vehicleId: text('vehicle_id')
		.notNull()
		.references(() => vehicles.id, { onDelete: 'cascade' }),
	vendorId: text('vendor_id').references(() => vendors.id, { onDelete: 'set null' }),
	description: text('description').notNull(),
	date: timestamp('date', { withTimezone: true }).notNull(),
	mileage: integer('mileage'),
	cost: integer('cost'), // Store in cents
	status: text('status').notNull().default('completed'), // completed, scheduled, in_progress
	/**
	 * The maintenance schedule this repair counts toward, if any. A completed repair
	 * linked here becomes the schedule's "last done"; the schedule outlives the repair
	 * (set null), and the repair outlives the schedule the same way.
	 */
	scheduleId: text('schedule_id').references(() => maintenanceSchedules.id, {
		onDelete: 'set null'
	}),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type Repair = typeof repairs.$inferSelect;
export type NewRepair = typeof repairs.$inferInsert;

// Vehicle Galleries (groups of photos for vehicles)
export const galleries = pgTable('galleries', {
	id: text('id').primaryKey(),
	vehicleId: text('vehicle_id')
		.notNull()
		.references(() => vehicles.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	order: integer('order').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type Gallery = typeof galleries.$inferSelect;
export type NewGallery = typeof galleries.$inferInsert;

// Vehicle Photos (images within galleries)
export const vehiclePhotos = pgTable('vehicle_photos', {
	id: text('id').primaryKey(),
	galleryId: text('gallery_id')
		.notNull()
		.references(() => galleries.id, { onDelete: 'cascade' }),
	imageUrl: text('image_url').notNull(),
	caption: text('caption'),
	order: integer('order').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type VehiclePhoto = typeof vehiclePhotos.$inferSelect;
export type NewVehiclePhoto = typeof vehiclePhotos.$inferInsert;

// Notes (flexible content blocks for vehicles, repairs, vendors, users)
export const notes = pgTable('notes', {
	id: serial('id').primaryKey(),
	uuid: text('uuid').notNull().unique(),
	title: text('title').notNull(),
	body: text('body'),
	imageUrl: text('image_url'),
	type: text('type').notNull().default('note'), // 'note' or 'gallery'
	order: integer('order'),
	parentNoteId: text('parent_note_id'), // FK to notes.uuid for nesting
	userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
	vehicleId: text('vehicle_id').references(() => vehicles.id, { onDelete: 'cascade' }),
	repairId: text('repair_id').references(() => repairs.id, { onDelete: 'cascade' }),
	vendorId: text('vendor_id').references(() => vendors.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

// Maintenance Schedules (per-vehicle recurring maintenance reminders)
export const maintenanceSchedules = pgTable('maintenance_schedules', {
	id: text('id').primaryKey(),
	vehicleId: text('vehicle_id')
		.notNull()
		.references(() => vehicles.id, { onDelete: 'cascade' }),
	name: text('name').notNull(), // e.g. "Oil Change", "Tire Rotation"
	intervalMiles: integer('interval_miles'), // e.g. 5000
	intervalMonths: integer('interval_months'), // e.g. 6
	lastCompletedDate: timestamp('last_completed_date', { withTimezone: true, mode: 'date' }),
	lastCompletedMileage: integer('last_completed_mileage'),
	/**
	 * When the digest last mailed about this schedule being due. Cleared whenever it is
	 * completed, so each due cycle earns exactly one email rather than one a day.
	 */
	reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true, mode: 'date' }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;

/**
 * Which renewal the digest last mailed about, per vehicle and kind, and for which
 * date. A renewal has no "mark done": the date on the vehicle simply moves. So a row
 * here whose `sent_for` still matches the vehicle's date means "already told"; once
 * the date changes, the next due cycle earns its own email.
 */
export const expirationReminders = pgTable(
	'expiration_reminders',
	{
		vehicleId: text('vehicle_id')
			.notNull()
			.references(() => vehicles.id, { onDelete: 'cascade' }),
		/** registration | inspection | emissions | insurance — `EXPIRATIONS` in src/lib/maintenance.ts */
		kind: text('kind').notNull(),
		sentFor: timestamp('sent_for', { withTimezone: true, mode: 'date' }).notNull(),
		sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
	},
	(table) => [primaryKey({ columns: [table.vehicleId, table.kind] })]
);
export type NewMaintenanceSchedule = typeof maintenanceSchedules.$inferInsert;
