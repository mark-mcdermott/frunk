/**
 * Ported from the SvelteKit app (`legacy/src/lib/server/db/schema.ts`).
 *
 * Table and column names are unchanged so the port is a drop-in against the same
 * Postgres shape. Deviations are commented inline where they exist.
 */
import {
	pgTable,
	bigint,
	boolean,
	integer,
	jsonb,
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

export const user = pgTable('user', {
	id: serial('id').primaryKey(),
	uuid: text('uuid').notNull().unique(),
	age: integer('age'),
	/** The sign-in identifier. It is an email address everywhere — the column name is the legacy one. */
	username: text('username').notNull().unique(),
	roles: integer('roles').array().notNull().default([]), // array of role IDs from roles table
	avatar: text('avatar'),
	emailVerified: integer('email_verified').notNull().default(0),
	emailVerificationToken: text('email_verification_token'),
	emailVerificationExpires: timestamp('email_verification_expires', {
		withTimezone: true,
		mode: 'date'
	}),
	cookieConsent: jsonb('cookie_consent'), // { essential: boolean, analytics: boolean, timestamp: number }
	/**
	 * TOTP is the recovery factor, not a second factor: it stands in for a passkey the
	 * user no longer has. Sealed with AES-256-GCM before it is stored — see
	 * `src/lib/server/auth/secrets.ts`. `totpEnabled` stays false until the user has
	 * proved they can produce a code, so a half-finished setup cannot lock anyone out.
	 */
	totpSecret: text('totp_secret'),
	totpEnabled: boolean('totp_enabled').notNull().default(false)
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	/**
	 * Cascades, unlike the SvelteKit schema, where this reference carried no
	 * `onDelete` — deleting a user who had ever signed in raised a foreign-key
	 * violation, since their session rows still pointed at them.
	 */
	userId: text('user_id')
		.notNull()
		.references(() => user.uuid, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;

/**
 * Passkeys. One row per authenticator a user has registered (Decision 2) — the
 * replacement for `user.password_hash`, which this phase drops.
 *
 * The public key is the only secret-adjacent thing here and it is, by design, public:
 * possession of it proves nothing. What authenticates is a signature over a
 * server-issued challenge, checked in `api/auth/login/verify`.
 */
export const credentials = pgTable('credentials', {
	/** The WebAuthn credential ID, base64url — already a string, so it is the key. */
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.uuid, { onDelete: 'cascade' }),
	/** COSE public key, base64url. */
	publicKey: text('public_key').notNull(),
	/**
	 * Signature counter. An authenticator that ever reports a counter at or below the
	 * stored one has been cloned; `@simplewebauthn/server` raises on that, which is
	 * the whole reason this is written back on every sign-in.
	 */
	counter: bigint('counter', { mode: 'number' }).notNull().default(0),
	/** JSON array of AuthenticatorTransport — a hint so the browser offers the right prompt. */
	transports: text('transports'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

export type Credential = typeof credentials.$inferSelect;

/**
 * Short-lived WebAuthn challenges. A ceremony is two round trips and the server has
 * to remember what it asked between them; a signature is only meaningful over a
 * challenge the server chose, so this cannot live in the client.
 *
 * Keyed by `register:<email>` or `login:<email>` so the two ceremonies cannot consume
 * each other's challenge. `userId` carries the account a registration is destined for:
 * the uuid of the account being upgraded in place, or a fresh one held aside so an
 * abandoned ceremony leaves no empty user row behind.
 */
export const webauthnChallenges = pgTable('webauthn_challenges', {
	key: text('key').primaryKey(),
	challenge: text('challenge').notNull(),
	userId: text('user_id'),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

/**
 * Fixed-window counters for the unauthenticated auth entry points, keyed by
 * `<action>:<email>`.
 *
 * TOTP recovery is a six-digit secret that grants a session, so it is brute-forceable
 * in a way a passkey is not. This is what keeps that from being a viable attack, and
 * it lives in Postgres rather than in memory because serverless instances do not share
 * one.
 */
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
	userId: text('user_id').references(() => user.uuid, { onDelete: 'set null' }),
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
		.references(() => user.uuid, { onDelete: 'cascade' }),

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
	registrationExpiration: timestamp('registration_expiration', { withTimezone: true, mode: 'date' }),
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
		.references(() => user.uuid, { onDelete: 'cascade' }),
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
	userId: text('user_id').references(() => user.uuid, { onDelete: 'cascade' }),
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
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;
export type NewMaintenanceSchedule = typeof maintenanceSchedules.$inferInsert;
