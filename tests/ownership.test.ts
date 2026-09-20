import { describe, expect, it } from 'vitest';
import { api, json, signUpAndSignIn, startDemo } from './helpers';

/**
 * The four-case auth matrix from Decision 11, run against every owned entity.
 *
 * This is the test that matters most in the whole suite. Before the port, a page gate
 * covered everything behind it; now each endpoint is independently reachable from the
 * internet, so **one missing check is a data leak** — and nothing in the type system
 * catches it, because a `userId` that belongs to someone else is still a string.
 *
 * The `DEMO` row is not optional either. Decision 5 rests demo safety *entirely* on
 * `user_id` scoping — there is no separate demo mode — so it is asserted directly
 * rather than assumed to follow from the others.
 */

/** Each entity, and a body that is valid enough to create one. */
const ENTITIES = [
	{
		path: '/api/vehicles',
		listKey: 'vehicles',
		itemKey: 'vehicle',
		create: () => ({ make: 'AMC', model: 'Gremlin', year: 1974 })
	},
	{
		path: '/api/vendors',
		listKey: 'vendors',
		itemKey: 'vendor',
		create: () => ({ name: 'Dunder Mifflin Auto' })
	}
] as const;

/** Responses are wrapped — `{ vehicles: [...] }`, `{ vehicle: {...} }` — not bare. */
type Wrapped = Record<string, unknown>;

describe.each(ENTITIES)('$path', ({ path, listKey, itemKey, create }) => {
	const list = async (cookie: string) =>
		((await json<Wrapped>(await api(path, { cookie })))[listKey] ?? []) as unknown[];

	const created = async (cookie: string) => {
		const response = await api(path, { method: 'POST', body: create(), cookie });
		expect(response.status).toBe(201);
		return ((await json<Wrapped>(response))[itemKey] as { id: string }).id;
	};
	it('refuses an anonymous request', async () => {
		expect((await api(path)).status).toBe(401);
	});

	it('refuses an anonymous write', async () => {
		const response = await api(path, { method: 'POST', body: create() });
		expect(response.status).toBe(401);
	});

	it('lists only your own rows', async () => {
		const alice = await signUpAndSignIn();
		const bob = await signUpAndSignIn();

		await created(alice.cookie);

		expect(await list(alice.cookie)).toHaveLength(1);
		expect(await list(bob.cookie)).toHaveLength(0);
	});

	it("answers 404 for someone else's row, not 403", async () => {
		const alice = await signUpAndSignIn();
		const bob = await signUpAndSignIn();

		const id = await created(alice.cookie);

		const response = await api(`${path}/${id}`, { cookie: bob.cookie });

		/*
		 * 404 rather than 403 on purpose: a 403 confirms the row exists, which is an
		 * existence oracle over someone else's data. `docs/API.md` states the rule, and
		 * `guard.ts` implements it as a `userId` predicate in the WHERE clause rather
		 * than a comparison after fetching.
		 */
		expect(response.status).toBe(404);
	});

	it("will not let you delete someone else's row", async () => {
		const alice = await signUpAndSignIn();
		const bob = await signUpAndSignIn();

		const id = await created(alice.cookie);

		expect((await api(`${path}/${id}`, { method: 'DELETE', cookie: bob.cookie })).status).toBe(404);

		// Still Alice's, untouched.
		expect((await api(`${path}/${id}`, { cookie: alice.cookie })).status).toBe(200);
	});

	it('isolates a demo account exactly like any other user', async () => {
		const alice = await signUpAndSignIn();
		const demo = await startDemo();

		const id = await created(alice.cookie);

		expect((await api(`${path}/${id}`, { cookie: demo.cookie })).status).toBe(404);
	});
});
