import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, json, signUpAndSignIn, type TestUser } from './helpers';

/**
 * VIN decoding and recalls, against a stand-in for NHTSA. `tests/run.sh` points
 * `NHTSA_BASE` at this file's server, which answers both of NHTSA's hosts' paths with
 * fixtures shaped like the real responses (captured 2026-10-03), so what is checked is
 * the normalization, the error mapping and the caching, without the suite depending on
 * a government API being up.
 */

const WRANGLER_VIN = '1J4FY19S5MP123456';
const UNKNOWN_VIN = '00000000000000000';
const BROKEN_VIN = 'BBBBBBBBBBBBBBBBB';

const DECODED: Record<string, string> = {
	ModelYear: '1991',
	Make: 'JEEP',
	Model: 'Wrangler',
	Trim: 'S',
	Series: '',
	BodyClass: 'Sport Utility Vehicle (SUV)/Multipurpose Vehicle (MPV)',
	DisplacementL: '4',
	EngineCylinders: '6',
	EngineConfiguration: 'In-Line',
	FuelTypePrimary: 'Gasoline',
	DriveType: '4WD/4-Wheel Drive/4x4',
	TransmissionStyle: 'Manual/Standard',
	TransmissionSpeeds: '5',
	ErrorCode: '1',
	ErrorText: '1 - Check Digit (9th position) does not calculate properly'
};

const RECALLS = [
	{
		NHTSACampaignNumber: '06E026000',
		Component: 'EXTERIOR LIGHTING',
		Summary: 'CERTAIN REPLACEMENT LAMPS FAIL TO CONFORM. THIS IS A SECOND SENTENCE.',
		Consequence: 'REDUCED VISIBILITY.',
		Remedy: 'OWNERS WILL BE OFFERED A REPURCHASE.',
		ReportReceivedDate: '23/03/2006'
	},
	{
		NHTSACampaignNumber: '93V105000',
		Component: 'STEERING',
		Summary: 'THE STEERING COLUMN MAY SEPARATE.',
		Consequence: 'LOSS OF STEERING CONTROL.',
		Remedy: 'DEALERS WILL INSPECT AND REPAIR.',
		ReportReceivedDate: '02/07/1993'
	}
];

const requests: string[] = [];
let nhtsa: Server;

beforeAll(async () => {
	nhtsa = createServer((request, response) => {
		const url = new URL(request.url ?? '/', 'http://stand-in');
		requests.push(url.pathname + url.search);
		const send = (status: number, body: unknown) => {
			response.writeHead(status, { 'content-type': 'application/json' });
			response.end(JSON.stringify(body));
		};

		if (url.pathname.startsWith('/api/vehicles/DecodeVinValues/')) {
			const vin = url.pathname.split('/').pop();
			if (vin === BROKEN_VIN) return send(500, {});
			const row = vin === WRANGLER_VIN ? DECODED : { Make: '', ErrorCode: '11' };
			return send(200, { Count: 1, Results: [row] });
		}
		if (url.pathname === '/recalls/recallsByVehicle') {
			const wrangler = url.searchParams.get('model')?.toLowerCase() === 'wrangler';
			const results = wrangler ? RECALLS : [];
			return send(200, { Count: results.length, results });
		}
		send(404, {});
	});
	const port = Number(new URL(process.env.NHTSA_BASE ?? 'http://localhost:4499').port);
	await new Promise<void>((resolve) => nhtsa.listen(port, resolve));
});

afterAll(async () => {
	await new Promise<void>((resolve) => nhtsa.close(() => resolve()));
});

describe('GET /api/vin/:vin', () => {
	let user: TestUser;
	beforeAll(async () => {
		user = await signUpAndSignIn();
	});

	it('is signed-in only', async () => {
		expect((await api(`/api/vin/${WRANGLER_VIN}`)).status).toBe(401);
	});

	it('refuses what cannot be a VIN before asking NHTSA', async () => {
		const before = requests.length;
		for (const bad of ['SHORT', '1J4FY19S5MP12345O', '1J4FY19S5MP1234567']) {
			const response = await api(`/api/vin/${bad}`, { cookie: user.cookie });
			expect(response.status).toBe(422);
		}
		expect(requests.length).toBe(before);
	});

	it('answers in the form’s own words, and keeps the answer for a day', async () => {
		const before = requests.length;
		const response = await api(`/api/vin/${WRANGLER_VIN.toLowerCase()}`, { cookie: user.cookie });
		expect(response.status).toBe(200);
		expect(await json(response)).toEqual({
			year: 1991,
			make: 'Jeep',
			model: 'Wrangler',
			trim: 'S',
			bodyStyle: 'SUV',
			engineSize: '4.0 L',
			engineType: 'I6',
			fuelType: 'Gasoline',
			drivetrain: '4WD',
			transmission: '5-speed manual',
			checkDigitFailed: true
		});

		await api(`/api/vin/${WRANGLER_VIN}`, { cookie: user.cookie });
		expect(requests.length - before).toBe(1);
	});

	it('is a 404 when NHTSA cannot tell even the make', async () => {
		const response = await api(`/api/vin/${UNKNOWN_VIN}`, { cookie: user.cookie });
		expect(response.status).toBe(404);
	});

	it('is a 502 naming the lookup when NHTSA fails', async () => {
		const response = await api(`/api/vin/${BROKEN_VIN}`, { cookie: user.cookie });
		expect(response.status).toBe(502);
		expect((await json<{ error: string }>(response)).error).toMatch(/VIN lookup/);
	});
});

describe('GET /api/vehicles/:id/recalls', () => {
	let owner: TestUser;
	let stranger: TestUser;
	let vehicleId: string;

	beforeAll(async () => {
		owner = await signUpAndSignIn();
		stranger = await signUpAndSignIn();
		const created = await api('/api/vehicles', {
			method: 'POST',
			body: { make: 'Jeep', model: 'Wrangler', year: 1991 },
			cookie: owner.cookie
		});
		vehicleId = (await json<{ vehicle: { id: string } }>(created)).vehicle.id;
	});

	it('is the owner’s alone', async () => {
		expect((await api(`/api/vehicles/${vehicleId}/recalls`)).status).toBe(401);
		const foreign = await api(`/api/vehicles/${vehicleId}/recalls`, { cookie: stranger.cookie });
		expect(foreign.status).toBe(404);
	});

	it('lists the model year’s recalls readably, newest first', async () => {
		const response = await api(`/api/vehicles/${vehicleId}/recalls`, { cookie: owner.cookie });
		expect(response.status).toBe(200);
		const { recalls } = await json<{ recalls: Record<string, string>[] }>(response);

		expect(recalls.map((recall) => recall.campaign)).toEqual(['06E026000', '93V105000']);
		expect(recalls[0]).toEqual({
			campaign: '06E026000',
			component: 'Exterior lighting',
			summary: 'Certain replacement lamps fail to conform. This is a second sentence.',
			consequence: 'Reduced visibility.',
			remedy: 'Owners will be offered a repurchase.',
			reportedOn: '2006-03-23'
		});
	});
});
