import { z } from 'zod';

/**
 * Request-body shapes for the whole API.
 *
 * The SvelteKit actions read `formData.get(...) as string` and validated ad hoc,
 * which is where most of their duplication lived. Declaring the shapes once means
 * a handler is a query plus an ownership check.
 *
 * Every update schema is the create schema made partial, so PATCH is genuinely
 * partial: an omitted key is left alone, an explicit `null` clears the column.
 */

const trimmed = z.string().trim();
const nonEmpty = trimmed.min(1);
/** Optional free text where "" from an empty form field means "clear it". */
const optionalText = trimmed
	.transform((v) => v || null)
	.nullable()
	.optional();
const optionalInt = z.number().int().nullable().optional();
/**
 * Dates cross the wire as ISO strings and reach Drizzle as `Date` — every
 * timestamp column on the schema is in the driver's default `date` mode.
 */
const isoDate = z.iso.datetime({ offset: true }).transform((v) => new Date(v));
const optionalDate = isoDate.nullable().optional();

const currentYear = new Date().getFullYear();
const year = z
	.number()
	.int()
	.min(1900, 'Please enter a valid year')
	.max(currentYear + 2, 'Please enter a valid year');

/**
 * Every optional vehicle column. Kept as one object so create and update cannot
 * drift apart — the 46 fields added in PR #28 have no UI yet, but the API exposes
 * them so Phase 4 can build the detail form against a complete surface.
 */
const vehicleOptionalFields = {
	vin: optionalText,
	image: optionalText,
	trim: optionalText,
	bodyStyle: optionalText,
	color: optionalText,
	interiorColor: optionalText,
	drivetrain: optionalText,
	transmission: optionalText,
	engineType: optionalText,
	engineSize: optionalText,
	fuelType: optionalText,

	nickname: optionalText,
	purchaseDate: optionalDate,
	purchasePrice: optionalInt,
	purchaseMileage: optionalInt,
	currentMileage: optionalInt,
	ownershipStatus: z.enum(['owned', 'leased', 'financed']).nullable().optional(),
	licensePlate: optionalText,
	licensePlateState: optionalText,
	isActive: z.number().int().min(0).max(1).optional(),

	registrationExpiration: optionalDate,
	inspectionExpiration: optionalDate,
	emissionsExpiration: optionalDate,

	insuranceProvider: optionalText,
	insurancePolicyNumber: optionalText,
	insuranceExpiration: optionalDate,

	lienHolder: optionalText,
	loanAccountNumber: optionalText,
	monthlyPayment: optionalInt,
	payoffDate: optionalDate,
	leaseEndDate: optionalDate,
	leaseAnnualMileage: optionalInt,

	lastOilChangeDate: optionalDate,
	lastOilChangeMileage: optionalInt,
	oilChangeIntervalMiles: optionalInt,
	tireRotationDueMileage: optionalInt,
	nextServiceDueMileage: optionalInt,

	seatingCapacity: optionalInt,
	doors: optionalInt,
	mpgCity: optionalInt,
	mpgHighway: optionalInt,
	fuelTankCapacity: optionalInt,
	towingCapacity: optionalInt,
	horsepower: optionalInt,
	torque: optionalInt,

	batteryCapacity: optionalInt,
	evRange: optionalInt,
	chargerType: optionalText
} as const;

export const createVehicleSchema = z.object({
	make: nonEmpty.max(120, 'Make is required'),
	model: nonEmpty.max(120, 'Model is required'),
	year,
	...vehicleOptionalFields
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const createVendorSchema = z.object({
	name: nonEmpty.max(200, 'Name is required'),
	address: optionalText,
	phone: optionalText,
	website: optionalText
});

export const updateVendorSchema = createVendorSchema.partial();

export const createRepairSchema = z.object({
	vehicleId: nonEmpty,
	description: nonEmpty.max(2000, 'Description is required'),
	date: isoDate,
	mileage: optionalInt,
	cost: optionalInt,
	vendorId: optionalText,
	status: z.enum(['completed', 'scheduled', 'in_progress']).default('completed')
});

export const updateRepairSchema = createRepairSchema.omit({ vehicleId: true }).partial();

export const createNoteSchema = z
	.object({
		title: nonEmpty.max(500, 'Title is required'),
		body: optionalText,
		imageUrl: optionalText,
		type: z.enum(['note', 'gallery']).default('note'),
		order: optionalInt,
		parentNoteId: optionalText,
		vehicleId: optionalText,
		repairId: optionalText,
		vendorId: optionalText
	})
	.refine((n) => n.vehicleId || n.repairId || n.vendorId || n.parentNoteId, {
		message: 'A note must attach to a vehicle, repair, vendor or parent note',
		path: ['vehicleId']
	});

export const updateNoteSchema = z.object({
	title: nonEmpty.max(500).optional(),
	body: optionalText,
	imageUrl: optionalText,
	order: optionalInt.optional()
});

export const createGallerySchema = z.object({
	vehicleId: nonEmpty,
	name: nonEmpty.max(200, 'Name is required'),
	description: optionalText,
	order: z.number().int().optional()
});

export const updateGallerySchema = z.object({
	name: nonEmpty.max(200).optional(),
	description: optionalText,
	/** Photo ids in their new display order — the drag-to-reorder save. */
	photoOrder: z.array(z.string()).optional()
});

export const createPhotoSchema = z.object({
	galleryId: nonEmpty,
	imageUrl: nonEmpty,
	caption: optionalText,
	order: z.number().int().optional()
});

export const updatePhotoSchema = z.object({
	imageUrl: nonEmpty.optional(),
	caption: optionalText,
	order: z.number().int().optional()
});

export const createScheduleSchema = z
	.object({
		vehicleId: nonEmpty,
		name: nonEmpty.max(200, 'Name is required'),
		intervalMiles: optionalInt,
		intervalMonths: optionalInt
	})
	.refine((s) => s.intervalMiles != null || s.intervalMonths != null, {
		message: 'Set a mileage interval, a month interval, or both',
		path: ['intervalMiles']
	});

export const updateScheduleSchema = z.object({
	name: nonEmpty.max(200).optional(),
	intervalMiles: optionalInt,
	intervalMonths: optionalInt,
	lastCompletedDate: optionalDate,
	lastCompletedMileage: optionalInt
});

/**
 * `name` and `image`, not `username` and `avatar` — those were the pre-port column
 * names, kept here by mistake through the Better Auth rename, so a PATCH carrying
 * them targeted columns that no longer exist. Email is deliberately absent: address
 * changes belong to Better Auth's verified change-email flow, not a raw column write.
 */
export const updateUserSchema = z.object({
	name: nonEmpty.max(200).optional(),
	image: optionalText,
	age: optionalInt,
	roles: z.array(z.number().int()).optional()
});

export const userListQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(10),
	sortBy: z.enum(['id', 'email', 'roles']).default('id'),
	sortOrder: z.enum(['asc', 'desc']).default('asc'),
	search: z.string().trim().default('')
});

/**
 * Auth bodies (Phase 3). Email is lowercased on the way in so `user.username` — which
 * is unique and case-sensitive in Postgres — cannot hold two rows for one address.
 */
const email = z
	.email('Enter a valid email address')
	.max(320)
	.transform((v) => v.toLowerCase());

export const authEmailSchema = z.object({ email });

/**
 * The authenticator's own response. Its shape is WebAuthn's, not ours, and
 * `@simplewebauthn/server` is what actually validates it — so this checks only that
 * `id` is present, which is the field the login lookup keys on.
 */
export const passkeyVerifySchema = z.object({
	email,
	response: z.looseObject({ id: z.string() })
});

const totpToken = z
	.string()
	.trim()
	.regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app');

export const totpEnableSchema = z.object({ token: totpToken });

export const totpRecoverSchema = z.object({ email, token: totpToken });

/**
 * The contact form — the one public, unauthenticated body the API accepts.
 *
 * `subject` is an enum rather than free text because it is interpolated into the email
 * subject line, and a closed set cannot carry a header injection or a misleading subject.
 * The length ceilings exist for the same reason the endpoint is rate limited: this is the
 * only way an anonymous visitor can cause frunk to send mail.
 */
export const contactSchema = z.object({
	name: nonEmpty.max(100),
	email,
	subject: z.enum(['general', 'support', 'feedback', 'privacy']),
	message: nonEmpty.max(5000)
});
