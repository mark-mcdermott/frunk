import { describe, expect, it } from 'vitest';
import { api, json, signUpAndSignIn, startDemo, type TestUser } from './helpers';

/**
 * Transitive ownership: repairs, galleries, schedules and photos do not carry a
 * `userId` of their own. They belong to a vehicle (or, for photos, to a gallery), and
 * the endpoints guard the *parent* with `ownedVehicle` / `ownedGallery` before writing.
 *
 * That makes these the easier ones to get wrong. A flat entity leaks only if someone
 * forgets a `WHERE`; a child leaks if someone forgets the parent check, or checks the
 * wrong parent, or checks it on `GET` but not on `POST`. Nothing in the type system
 * distinguishes your vehicle's id from mine — both are `string`.
 *
 * So the question each of these asks is the same: **can Bob attach something to Alice's
 * vehicle?** The answer must be 404 — not 403, which would confirm the vehicle exists.
 */

async function vehicleFor(user: TestUser): Promise<string> {
	const response = await api('/api/vehicles', {
		method: 'POST',
		body: { make: 'AMC', model: 'Gremlin', year: 1974 },
		cookie: user.cookie
	});
	expect(response.status).toBe(201);
	return (await json<{ vehicle: { id: string } }>(response)).vehicle.id;
}

async function galleryFor(user: TestUser, vehicleId: string): Promise<string> {
	const response = await api('/api/galleries', {
		method: 'POST',
		body: { vehicleId, name: 'Engine bay' },
		cookie: user.cookie
	});
	expect(response.status).toBe(201);
	return (await json<{ gallery: { id: string } }>(response)).gallery.id;
}

/** Each child, and a body that would be valid if the parent were yours. */
const CHILDREN = [
	{
		path: '/api/repairs',
		body: (vehicleId: string) => ({
			vehicleId,
			description: 'Alignment',
			date: new Date().toISOString()
		})
	},
	{
		path: '/api/galleries',
		body: (vehicleId: string) => ({ vehicleId, name: 'Engine bay' })
	},
	{
		path: '/api/maintenance-schedules',
		body: (vehicleId: string) => ({ vehicleId, name: 'Oil change', intervalMiles: 5000 })
	}
] as const;

describe.each(CHILDREN)('$path', ({ path, body }) => {
	it("refuses to attach to someone else's vehicle", async () => {
		const alice = await signUpAndSignIn();
		const bob = await signUpAndSignIn();
		const vehicleId = await vehicleFor(alice);

		const response = await api(path, { method: 'POST', body: body(vehicleId), cookie: bob.cookie });

		expect(response.status).toBe(404);
	});

	it("refuses a demo account the same way", async () => {
		const alice = await signUpAndSignIn();
		const demo = await startDemo();
		const vehicleId = await vehicleFor(alice);

		const response = await api(path, { method: 'POST', body: body(vehicleId), cookie: demo.cookie });

		expect(response.status).toBe(404);
	});

	it('allows the owner', async () => {
		const alice = await signUpAndSignIn();
		const vehicleId = await vehicleFor(alice);

		const response = await api(path, {
			method: 'POST',
			body: body(vehicleId),
			cookie: alice.cookie
		});

		expect(response.status).toBe(201);
	});
});

describe('/api/photos', () => {
	it("refuses to add a photo to someone else's gallery", async () => {
		const alice = await signUpAndSignIn();
		const bob = await signUpAndSignIn();
		const galleryId = await galleryFor(alice, await vehicleFor(alice));

		const response = await api('/api/photos', {
			method: 'POST',
			body: { galleryId, imageUrl: 'https://example.com/a.jpg' },
			cookie: bob.cookie
		});

		expect(response.status).toBe(404);
	});

	it('allows the owner', async () => {
		const alice = await signUpAndSignIn();
		const galleryId = await galleryFor(alice, await vehicleFor(alice));

		const response = await api('/api/photos', {
			method: 'POST',
			body: { galleryId, imageUrl: 'https://example.com/a.jpg' },
			cookie: alice.cookie
		});

		expect(response.status).toBe(201);
	});
});

describe('/api/repairs listing', () => {
	it("does not return another user's repairs", async () => {
		const alice = await signUpAndSignIn();
		const bob = await signUpAndSignIn();
		const vehicleId = await vehicleFor(alice);

		await api('/api/repairs', {
			method: 'POST',
			body: { vehicleId, description: 'Alignment', date: new Date().toISOString() },
			cookie: alice.cookie
		});

		const mine = await json<{ repairs: unknown[] }>(await api('/api/repairs', { cookie: alice.cookie }));
		const theirs = await json<{ repairs: unknown[] }>(await api('/api/repairs', { cookie: bob.cookie }));

		expect(mine.repairs).toHaveLength(1);
		expect(theirs.repairs).toHaveLength(0);
	});
});
