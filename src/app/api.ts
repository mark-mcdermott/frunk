/**
 * The applet's view of the API.
 *
 * Every endpoint wraps its payload — `{ vehicles: [...] }`, `{ vehicle: {...} }` — so
 * these helpers unwrap once here rather than at every call site. The shapes are the
 * ones `tests/ownership.test.ts` asserts, which is what stops this drifting from the
 * server.
 */

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
	const response = await fetch(path, {
		...init,
		headers: {
			...(init?.body ? { 'content-type': 'application/json' } : {}),
			...init?.headers
		}
	});

	if (response.status === 401) {
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
}

export interface NoteInput {
	title: string;
	body: string | null;
	vehicleId?: string;
	repairId?: string;
}

export interface Vendor {
	id: string;
	name: string;
	address: string | null;
	phone: string | null;
	website: string | null;
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
		'nickname' | 'vin' | 'bodyStyle' | 'color' | 'transmission' | 'engineType' | 'engineSize',
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
	vehicles: ['vehicles'] as const,
	vehicle: (id: string) => ['vehicles', id] as const,
	vendors: ['vendors'] as const,
	vendor: (id: string) => ['vendors', id] as const,
	repairs: ['repairs'] as const,
	repair: (id: string) => ['repairs', id] as const,
	notes: ['notes'] as const,
	note: (uuid: string) => ['notes', uuid] as const
};

export const listVehicles = () =>
	request<{ vehicles: Vehicle[] }>('/api/vehicles').then((r) => r.vehicles);

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

export const getRepair = (id: string) =>
	request<{ repair: RepairRow }>(`/api/repairs/${id}`).then((r) => r.repair);

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

export const listNotes = () => request<{ notes: NoteRow[] }>('/api/notes').then((r) => r.notes);

export const getNote = (uuid: string) =>
	request<{ note: NoteRow }>(`/api/notes/${uuid}`).then((r) => r.note);

export const createNote = (body: NoteInput) =>
	request<{ note: Note }>('/api/notes', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.note);

export const updateNote = (uuid: string, body: Pick<NoteInput, 'title' | 'body'>) =>
	request<{ note: Note }>(`/api/notes/${uuid}`, {
		method: 'PATCH',
		body: JSON.stringify(body)
	}).then((r) => r.note);

export const deleteNote = (uuid: string) =>
	request<void>(`/api/notes/${uuid}`, { method: 'DELETE' });
