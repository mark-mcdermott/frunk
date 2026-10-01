/**
 * The applet's view of the API.
 *
 * Every endpoint wraps its payload — `{ vehicles: [...] }`, `{ vehicle: {...} }` — so
 * these helpers unwrap once here rather than at every call site. The shapes are the
 * ones `tests/ownership.test.ts` asserts, which is what stops this drifting from the
 * server.
 */

import type { Summary } from '@/lib/maintenance';
import { apiUrl } from '@/lib/platform';
import { authHeaders, clearToken } from '@/lib/session-token';

export class ApiError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	// `apiUrl` and `authHeaders` are both no-ops on the web; the native bundle calls
	// the deployed origin with its bearer token (`src/lib/platform.ts`).
	const response = await fetch(apiUrl(path), {
		...init,
		headers: {
			...(init?.body ? { 'content-type': 'application/json' } : {}),
			...authHeaders(),
			...init?.headers
		}
	});

	if (response.status === 401) {
		await clearToken();
		/*
		 * The session is gone — expired, or signed out in another tab. Sending them to
		 * sign-in beats rendering an empty screen that looks like they own nothing.
		 */
		window.location.assign('/signin');
		throw new ApiError(401, 'Not signed in');
	}

	if (!response.ok) {
		const body = (await response.json().catch(() => ({}))) as { error?: string };
		throw new ApiError(response.status, body.error ?? 'Something went wrong.');
	}

	if (response.status === 204) return undefined as T;
	return (await response.json()) as T;
}

/**
 * Timestamps cross the wire as ISO strings; `schemas.ts` parses them back to `Date`
 * server-side. Nothing in the applet should hold a `Date` for a server value.
 */
export interface Vehicle {
	id: string;
	make: string;
	model: string;
	year: number;
	nickname: string | null;
	vin: string | null;
	image: string | null;
	trim: string | null;
	bodyStyle: string | null;
	color: string | null;
	transmission: string | null;
	engineType: string | null;
	engineSize: string | null;
	currentMileage: number | null;
	licensePlate: string | null;
	licensePlateState: string | null;
	/** Renewal dates — ISO, or null when unknown. `assessExpirations` reads these. */
	registrationExpiration: string | null;
	inspectionExpiration: string | null;
	emissionsExpiration: string | null;
	insuranceProvider: string | null;
	insurancePolicyNumber: string | null;
	insuranceExpiration: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Note {
	uuid: string;
	title: string;
	body: string | null;
	imageUrl: string | null;
}

export interface Repair {
	id: string;
	description: string;
	date: string;
	mileage: number | null;
	/** Cents. The column is an integer; formatting is the UI's job. */
	cost: number | null;
	status: string;
	vendorId: string | null;
	vendorName: string | null;
	/** The maintenance schedule this counts toward, if any. */
	scheduleId: string | null;
	/** Receipts and documents on the repair — the count, for a chip; the files come with the detail. */
	attachmentCount: number;
}

/** A receipt, invoice or photo on a repair. `url` is the private serving path. */
export interface Attachment {
	id: string;
	repairId: string;
	url: string;
	name: string;
	contentType: string;
	size: number;
	createdAt: string;
}

export interface Photo {
	id: string;
	imageUrl: string;
	caption: string | null;
}

export interface Gallery {
	id: string;
	name: string;
	description: string | null;
	photos: Photo[];
}

export interface Schedule {
	id: string;
	name: string;
	intervalMiles: number | null;
	intervalMonths: number | null;
	lastCompletedDate: string | null;
	lastCompletedMileage: number | null;
}

/** `GET /api/repairs` joins the vehicle and vendor names in. */
export interface RepairRow extends Repair {
	vehicleId: string;
	vehicleMake: string;
	vehicleModel: string;
	vehicleYear: number;
}

/** `GET /api/notes` joins the owning vehicle in. */
export interface NoteRow extends Note {
	vehicleId: string | null;
	createdAt: string;
	vehicle: { vehicleMake: string; vehicleModel: string; vehicleYear: number };
}

export type RepairStatus = 'completed' | 'scheduled' | 'in_progress';

export interface RepairInput {
	vehicleId?: string;
	description: string;
	/** ISO 8601 with an offset — `schemas.ts` parses it back to a `Date`. */
	date: string;
	mileage: number | null;
	/** Cents, matching the integer column. */
	cost: number | null;
	vendorId: string | null;
	status: RepairStatus;
	scheduleId?: string | null;
}

export interface NoteInput {
	title: string;
	body: string | null;
	imageUrl?: string | null;
	vehicleId?: string;
	repairId?: string;
}

export interface VendorInput {
	name: string;
	address: string | null;
	phone: string | null;
	website: string | null;
}

export interface ScheduleInput {
	vehicleId?: string;
	name: string;
	intervalMiles: number | null;
	intervalMonths: number | null;
}

/** `updateScheduleSchema` accepts these two; create does not. */
export type ScheduleUpdate = Omit<ScheduleInput, 'vehicleId'> & {
	lastCompletedDate?: string | null;
	lastCompletedMileage?: number | null;
};

export interface Vendor {
	id: string;
	name: string;
	address: string | null;
	phone: string | null;
	website: string | null;
}

/** The admin list's row shape — `GET /api/users` (admin only). */
export interface AdminUser {
	id: string;
	email: string;
	name: string;
	image: string | null;
	roles: number[];
}

export interface UserListParams {
	page: number;
	pageSize: number;
	search: string;
}

export interface UserList extends UserListParams {
	users: AdminUser[];
	total: number;
}

/** `GET /api/vehicles` badges each row with its due counts; the detail does not. */
export interface VehicleListItem extends Vehicle {
	maintenance: Summary;
}

/** `GET /api/vehicles/:id` answers the whole detail screen in one request. */
export interface VehicleDetail {
	vehicle: Vehicle;
	notes: Note[];
	repairs: Repair[];
	vendors: Vendor[];
	galleries: Gallery[];
	schedules: Schedule[];
}

/**
 * What the vehicle form sends.
 *
 * PATCH is genuinely partial (`docs/API.md`): an omitted key is left alone and an
 * explicit `null` clears the column — so an emptied optional field must send `null`,
 * not `''` and not nothing.
 */
export type VehicleInput = {
	make: string;
	model: string;
	year: number;
} & Partial<
	Record<
		| 'nickname'
		| 'vin'
		| 'bodyStyle'
		| 'color'
		| 'transmission'
		| 'engineType'
		| 'engineSize'
		| 'image'
		| 'licensePlate'
		| 'licensePlateState'
		| 'registrationExpiration'
		| 'inspectionExpiration'
		| 'emissionsExpiration'
		| 'insuranceProvider'
		| 'insurancePolicyNumber'
		| 'insuranceExpiration',
		string | null
	>
> & { currentMileage?: number | null };

/**
 * Query keys, in one place.
 *
 * A mutation invalidates by the same key its list is cached under, so they have to
 * agree — scattering the literals is how a list silently stops refreshing after a
 * create.
 */
export const keys = {
	account: ['account'] as const,
	vehicles: ['vehicles'] as const,
	vehicle: (id: string) => ['vehicles', id] as const,
	vendors: ['vendors'] as const,
	vendor: (id: string) => ['vendors', id] as const,
	repairs: ['repairs'] as const,
	repair: (id: string) => ['repairs', id] as const,
	notes: ['notes'] as const,
	note: (uuid: string) => ['notes', uuid] as const,
	users: (params: UserListParams) => ['users', params] as const,
	user: (id: string) => ['users', 'one', id] as const
};

export const listVehicles = () =>
	request<{ vehicles: VehicleListItem[] }>('/api/vehicles').then((r) => r.vehicles);

export const getVehicle = (id: string) => request<VehicleDetail>(`/api/vehicles/${id}`);

export const listVendors = () =>
	request<{ vendors: Vendor[] }>('/api/vendors').then((r) => r.vendors);

export const createVehicle = (body: VehicleInput) =>
	request<{ vehicle: Vehicle }>('/api/vehicles', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.vehicle);

export const updateVehicle = (id: string, body: Partial<VehicleInput>) =>
	request<{ vehicle: Vehicle }>(`/api/vehicles/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	}).then((r) => r.vehicle);

export const deleteVehicle = (id: string) =>
	request<void>(`/api/vehicles/${id}`, { method: 'DELETE' });

export const listRepairs = () =>
	request<{ repairs: RepairRow[] }>('/api/repairs').then((r) => r.repairs);

/**
 * Unlike the list, `GET /api/repairs/:id` returns the **raw row** — no vendor or
 * vehicle names joined in. Screens join those from the cached lists instead of this
 * type pretending they arrive here. (It used to claim `RepairRow`; the extra fields
 * were silently undefined.)
 */
export interface RepairDetail {
	repair: Repair & { vehicleId: string };
	/** Notes attached to this repair — the only place they surface. */
	notes: NoteDetail[];
	attachments: Attachment[];
}

export const getRepair = (id: string) => request<RepairDetail>(`/api/repairs/${id}`);

export const createRepair = (body: RepairInput) =>
	request<{ repair: Repair }>('/api/repairs', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.repair);

export const updateRepair = (id: string, body: Omit<RepairInput, 'vehicleId'>) =>
	request<{ repair: Repair }>(`/api/repairs/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	}).then((r) => r.repair);

export const deleteRepair = (id: string) =>
	request<void>(`/api/repairs/${id}`, { method: 'DELETE' });

export interface AttachmentInput {
	url: string;
	name: string;
	contentType: string;
	size: number;
}

/** After `uploadFile`: hangs the uploaded file on the repair. */
export const addAttachment = (repairId: string, body: AttachmentInput) =>
	request<{ attachment: Attachment }>(`/api/repairs/${repairId}/attachments`, {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.attachment);

export const deleteAttachment = (id: string) =>
	request<void>(`/api/attachments/${id}`, { method: 'DELETE' });

export const listNotes = () => request<{ notes: NoteRow[] }>('/api/notes').then((r) => r.notes);

/** The raw note row — `GET /api/notes/:uuid` does not join the vehicle in. */
export interface NoteDetail extends Note {
	vehicleId: string | null;
	repairId: string | null;
	parentNoteId: string | null;
	createdAt: string;
}

export const getNote = (uuid: string) =>
	request<{ note: NoteDetail; children: NoteDetail[] }>(`/api/notes/${uuid}`);

export const createNote = (body: NoteInput) =>
	request<{ note: Note }>('/api/notes', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.note);

export const updateNote = (uuid: string, body: Pick<NoteInput, 'title' | 'body' | 'imageUrl'>) =>
	request<{ note: Note }>(`/api/notes/${uuid}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	}).then((r) => r.note);

export const deleteNote = (uuid: string) =>
	request<void>(`/api/notes/${uuid}`, { method: 'DELETE' });

export const createVendor = (body: VendorInput) =>
	request<{ vendor: Vendor }>('/api/vendors', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.vendor);

export const updateVendor = (id: string, body: VendorInput) =>
	request<{ vendor: Vendor }>(`/api/vendors/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	}).then((r) => r.vendor);

export const deleteVendor = (id: string) =>
	request<void>(`/api/vendors/${id}`, { method: 'DELETE' });

export const createSchedule = (body: ScheduleInput) =>
	request<{ schedule: Schedule }>('/api/maintenance-schedules', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.schedule);

export const updateSchedule = (id: string, body: ScheduleUpdate) =>
	request<{ schedule: Schedule }>(`/api/maintenance-schedules/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	}).then((r) => r.schedule);

export const deleteSchedule = (id: string) =>
	request<void>(`/api/maintenance-schedules/${id}`, { method: 'DELETE' });

export interface CompletionInput {
	/** ISO 8601 with an offset. */
	date: string;
	mileage: number | null;
	/** Cents. */
	cost: number | null;
	vendorId?: string | null;
	/** Default true: the service is logged as a completed repair on the schedule. */
	logRepair?: boolean;
}

export interface Completed {
	schedule: Schedule;
	repair: Repair | null;
	currentMileage: number | null;
}

export const completeSchedule = (id: string, body: CompletionInput) =>
	request<Completed>(`/api/maintenance-schedules/${id}/complete`, {
		method: 'POST',
		body: JSON.stringify(body)
	});

/**
 * Raw-body upload: one file per request, the browser's `File` object as the body and
 * its type as the content-type header. Returns the app-relative serving URL
 * (`/api/files/u/<userId>/…`) that goes straight into an `image` / `imageUrl` column.
 */
export const uploadFile = (file: File) =>
	request<{ url: string; pathname: string }>(
		`/api/uploads?filename=${encodeURIComponent(file.name)}`,
		{ method: 'POST', body: file, headers: { 'content-type': file.type } }
	);

export const createGallery = (body: {
	vehicleId: string;
	name: string;
	description?: string | null;
}) =>
	request<{ gallery: Gallery }>('/api/galleries', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.gallery);

export const deleteGallery = (id: string) =>
	request<void>(`/api/galleries/${id}`, { method: 'DELETE' });

export const createPhoto = (body: {
	galleryId: string;
	imageUrl: string;
	caption?: string | null;
}) =>
	request<{ photo: Photo }>('/api/photos', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.photo);

export const deletePhoto = (id: string) => request<void>(`/api/photos/${id}`, { method: 'DELETE' });

export const listUsers = (params: UserListParams) => {
	const query = new URLSearchParams({
		page: String(params.page),
		pageSize: String(params.pageSize),
		...(params.search ? { search: params.search } : {})
	});
	return request<UserList>(`/api/users?${query}`);
};

export const getUser = (id: string) =>
	request<{ user: AdminUser & { age: number | null } }>(`/api/users/${id}`).then((r) => r.user);

export const updateUser = (id: string, body: { name?: string; roles?: number[] }) =>
	request<{ user: AdminUser }>(`/api/users/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	}).then((r) => r.user);

export const deleteUser = (id: string) => request<void>(`/api/users/${id}`, { method: 'DELETE' });

// ---- account (the caller's own credentials; see docs/API.md)

export interface AccountSecurity {
	hasPassword: boolean;
	passkeys: number;
}

export const getAccount = () => request<AccountSecurity>('/api/account');

export const setAccountPassword = (password: string) =>
	request<void>('/api/account/password', { method: 'POST', body: JSON.stringify({ password }) });

/** Removes one of the caller's own uploaded files — see `DELETE /api/uploads`. */
export const deleteUpload = (url: string) =>
	request<void>(`/api/uploads?url=${encodeURIComponent(url)}`, { method: 'DELETE' });
