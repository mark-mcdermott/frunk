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

export interface Vehicle {
	id: string;
	make: string;
	model: string;
	year: number;
	nickname: string | null;
	vin: string | null;
	image: string | null;
	currentMileage: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface Vendor {
	id: string;
	name: string;
	address: string | null;
	phone: string | null;
	website: string | null;
}

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
	vendor: (id: string) => ['vendors', id] as const
};

export const listVehicles = () =>
	request<{ vehicles: Vehicle[] }>('/api/vehicles').then((r) => r.vehicles);

export const getVehicle = (id: string) =>
	request<{ vehicle: Vehicle }>(`/api/vehicles/${id}`).then((r) => r.vehicle);

export const listVendors = () =>
	request<{ vendors: Vendor[] }>('/api/vendors').then((r) => r.vendors);

export const createVehicle = (body: Partial<Vehicle>) =>
	request<{ vehicle: Vehicle }>('/api/vehicles', {
		method: 'POST',
		body: JSON.stringify(body)
	}).then((r) => r.vehicle);

export const deleteVehicle = (id: string) =>
	request<void>(`/api/vehicles/${id}`, { method: 'DELETE' });
