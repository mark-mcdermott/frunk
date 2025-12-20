import { pgTable, integer, text, timestamp, jsonb, serial } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: serial('id').primaryKey(),
	uuid: text('uuid').notNull().unique(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	admin: integer('admin').notNull().default(0),
	avatar: text('avatar'),
	emailVerified: integer('email_verified').notNull().default(0),
	emailVerificationToken: text('email_verification_token'),
	emailVerificationExpires: timestamp('email_verification_expires', { withTimezone: true, mode: 'date' })
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.uuid),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;

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
	make: text('make').notNull(),
	model: text('model').notNull(),
	year: integer('year').notNull(),
	vin: text('vin'),
	image: text('image'),
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
