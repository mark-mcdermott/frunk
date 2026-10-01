import { createPrivateKey, createPublicKey, createVerify } from 'node:crypto';
import { createServer, type Http2Server } from 'node:http2';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, json, signUpAndSignIn, sql, type TestUser } from './helpers';

/**
 * Push notifications: the device-token endpoint, and the digest delivering through
 * Apple's service — which here is a stand-in. `tests/run.sh` points `APNS_HOST` at this
 * file's own HTTP/2 server and generates the signing key, so what the app would send
 * to Apple is what this file receives: the path naming the device, the topic, a
 * provider token signed with the key, and the alert. The stand-in answers 410 for any
 * token beginning `gone-`, which is how Apple says an app was removed.
 */

interface Received {
	path: string;
	headers: Record<string, string | string[] | undefined>;
	body: { aps: { alert: { title: string; body: string } }; vehicleId?: string };
}

const received: Received[] = [];
let apple: Http2Server;

beforeAll(async () => {
	apple = createServer();
	apple.on('stream', (stream, headers) => {
		let raw = '';
		stream.setEncoding('utf8');
		stream.on('data', (chunk: string) => {
			raw += chunk;
		});
		stream.on('end', () => {
			const path = String(headers[':path']);
			received.push({ path, headers, body: JSON.parse(raw) as Received['body'] });
			if (path.includes('/gone-')) {
				stream.respond({ ':status': 410, 'content-type': 'application/json' });
				stream.end(JSON.stringify({ reason: 'Unregistered' }));
			} else {
				stream.respond({ ':status': 200 });
				stream.end();
			}
		});
	});
	const port = Number(new URL(process.env.APNS_HOST ?? 'http://localhost:4488').port);
	await new Promise<void>((resolve) => apple.listen(port, resolve));
});

afterAll(async () => {
	await new Promise<void>((resolve) => apple.close(() => resolve()));
});

const register = (user: TestUser | null, token: string, platform = 'ios') =>
	api('/api/push/device-token', {
		method: 'POST',
		body: { platform, token },
		cookie: user?.cookie
	});

const owner = (token: string) =>
	sql(`select coalesce((select user_id from device_tokens where token = '${token}'), '<none>')`);

describe('/api/push/device-token', () => {
	it('needs a session and a platform it knows', async () => {
		const alice = await signUpAndSignIn();
		expect((await register(null, 'anonymous-token')).status).toBe(401);
		expect((await register(alice, 'some-token', 'blackberry')).status).toBe(422);
	});

	it('moves a phone to whoever signed in on it last', async () => {
		const alice = await signUpAndSignIn();
		const bob = await signUpAndSignIn();
		const token = `phone-${crypto.randomUUID()}`;

		expect((await register(alice, token)).status).toBe(201);
		expect(await owner(token)).toBe(alice.id);

		// Registering again is the launch-time refresh: same row, same owner.
		expect((await register(alice, token)).status).toBe(201);
		expect(await sql(`select count(*) from device_tokens where token = '${token}'`)).toBe('1');

		expect((await register(bob, token)).status).toBe(201);
		expect(await owner(token)).toBe(bob.id);
		expect(await sql(`select count(*) from device_tokens where token = '${token}'`)).toBe('1');

		// Alice cannot take Bob's phone off the list; Bob can.
		const remove = (user: TestUser) =>
			api('/api/push/device-token', { method: 'DELETE', body: { token }, cookie: user.cookie });
		expect((await remove(alice)).status).toBe(204);
		expect(await owner(token)).toBe(bob.id);
		expect((await remove(bob)).status).toBe(204);
		expect(await owner(token)).toBe('<none>');
	});
});

describe('the digest, by push', () => {
	const SECRET = process.env.CRON_SECRET ?? '';
	const run = () =>
		fetch(`${process.env.TEST_BASE}/api/cron/maintenance-digest`, {
			headers: { authorization: `Bearer ${SECRET}` }
		});

	it('notifies the phones of someone with something overdue, once, and forgets a dead token', async () => {
		const alice = await signUpAndSignIn();

		const created = await api('/api/vehicles', {
			method: 'POST',
			body: { make: 'AMC', model: 'Gremlin', year: 1974, currentMileage: 50000 },
			cookie: alice.cookie
		});
		const vehicleId = (await json<{ vehicle: { id: string } }>(created)).vehicle.id;
		const scheduled = await api('/api/maintenance-schedules', {
			method: 'POST',
			body: { vehicleId, name: 'Oil change', intervalMiles: 5000 },
			cookie: alice.cookie
		});
		const scheduleId = (await json<{ schedule: { id: string } }>(scheduled)).schedule.id;
		// Last done 6,000 miles ago on a 5,000-mile interval: overdue.
		await api(`/api/maintenance-schedules/${scheduleId}`, {
			method: 'PATCH',
			body: { lastCompletedDate: new Date().toISOString(), lastCompletedMileage: 44000 },
			cookie: alice.cookie
		});

		const live = `live-${crypto.randomUUID()}`;
		const gone = `gone-${crypto.randomUUID()}`;
		await register(alice, live);
		await register(alice, gone);

		const first = await run();
		expect(first.status).toBe(200);
		expect((await json<{ sent: number }>(first)).sent).toBeGreaterThan(0);

		const push = received.find((request) => request.path === `/3/device/${live}`);
		expect(push, 'the live phone was pushed to').toBeDefined();
		expect(push?.headers[':method']).toBe('POST');
		expect(push?.headers['apns-topic']).toBe('com.frunk.app');
		expect(push?.headers['apns-push-type']).toBe('alert');
		expect(push?.body.aps.alert).toEqual({
			title: 'Oil change is overdue',
			body: '1974 AMC Gremlin · Overdue by 1,000 mi'
		});
		// What a tap needs to open the right car.
		expect(push?.body.vehicleId).toBe(vehicleId);

		// The provider token: an ES256 JWT naming the key and the team, signed by the key.
		const [scheme, jwt = ''] = String(push?.headers.authorization).split(' ');
		expect(scheme).toBe('bearer');
		const [header = '', claims = '', signature = ''] = jwt.split('.');
		const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString());
		expect(decode(header)).toEqual({ alg: 'ES256', kid: 'TESTKEY123' });
		expect(decode(claims)).toMatchObject({ iss: 'TESTTEAM12' });
		const publicKey = createPublicKey(createPrivateKey(process.env.APNS_KEY ?? ''));
		expect(
			createVerify('SHA256')
				.update(`${header}.${claims}`)
				.verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url'))
		).toBe(true);

		// Told: recorded on the schedule. Gone: the token Apple refused is forgotten.
		expect(
			await sql(
				`select reminder_sent_at is not null from maintenance_schedules where id = '${scheduleId}'`
			)
		).toBe('t');
		expect(await owner(live)).toBe(alice.id);
		expect(await owner(gone)).toBe('<none>');

		// A second run has nothing new to say to that phone.
		const before = received.filter((request) => request.path === `/3/device/${live}`).length;
		expect((await run()).status).toBe(200);
		expect(received.filter((request) => request.path === `/3/device/${live}`)).toHaveLength(before);
	});
});
