import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { api, json, signUpAndSignIn, type TestUser } from './helpers';

/**
 * The maintenance history a seller hands a buyer: `GET /api/vehicles/:id/report` (PDF)
 * and `GET /api/vehicles/:id/history.csv`. The PDF is checked for what a response can
 * prove — it is a PDF, it is a download, it is named for the car, it has pages — and
 * the CSV, being text, is checked line by line. Ownership is the usual 404.
 */

async function garage(user: TestUser) {
	const created = await api('/api/vehicles', {
		method: 'POST',
		body: {
			make: 'AMC',
			model: 'Gremlin',
			year: 1974,
			currentMileage: 84200,
			vin: 'A4A158A123456'
		},
		cookie: user.cookie
	});
	expect(created.status).toBe(201);
	const vehicleId = (await json<{ vehicle: { id: string } }>(created)).vehicle.id;

	for (const [description, cost, date] of [
		['Oil change', 4500, '2026-03-01T12:00:00Z'],
		['Brake pads, "front"', 35000, '2026-06-15T12:00:00Z']
	] as const) {
		const repair = await api('/api/repairs', {
			method: 'POST',
			body: { vehicleId, description, cost, date, mileage: 80000 },
			cookie: user.cookie
		});
		expect(repair.status).toBe(201);
	}
	const schedule = await api('/api/maintenance-schedules', {
		method: 'POST',
		body: { vehicleId, name: 'Tire rotation', intervalMiles: 6000 },
		cookie: user.cookie
	});
	expect(schedule.status).toBe(201);
	return vehicleId;
}

/**
 * Every FlateDecode stream in the file, inflated, with each `[<hex> …] TJ` text run
 * decoded back to characters — pdfkit writes standard-font text as hex glyph strings,
 * one array per line, kerning adjustments in between.
 */
function inflatedText(pdf: Buffer): string {
	const parts: string[] = [];
	const pattern = /stream\r?\n/g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(pdf.toString('latin1'))) !== null) {
		const start = match.index + match[0].length;
		const end = pdf.indexOf('endstream', start);
		if (end === -1) break;
		try {
			parts.push(inflateSync(pdf.subarray(start, end)).toString('latin1'));
		} catch {
			// Not a deflated stream (an image, say) — nothing to read here.
		}
	}
	const runs: string[] = [];
	for (const match of parts.join('\n').matchAll(/\[([^\]]*)\]\s*TJ/g)) {
		const array = match[1] ?? '';
		runs.push(
			[...array.matchAll(/<([0-9A-Fa-f]+)>/g)]
				.map((glyphs) => Buffer.from(glyphs[1] ?? '', 'hex').toString('latin1'))
				.join('')
		);
	}
	return runs.join('\n');
}

describe('GET /api/vehicles/:id/report', () => {
	it('answers a PDF download named for the car', async () => {
		const alice = await signUpAndSignIn();
		const vehicleId = await garage(alice);

		const response = await api(`/api/vehicles/${vehicleId}/report`, { cookie: alice.cookie });
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('application/pdf');
		expect(response.headers.get('content-disposition')).toBe(
			'attachment; filename="1974-AMC-Gremlin-history.pdf"'
		);

		const bytes = Buffer.from(await response.arrayBuffer());
		expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
		expect(bytes.length).toBeGreaterThan(2000);
		// The structure is plain; the page text sits in deflated streams, so inflate them
		// and look for what a buyer would: the car, the services, the total.
		const raw = bytes.toString('latin1');
		expect(raw).toContain('/Type /Page');
		const text = inflatedText(bytes);
		for (const expected of ['1974 AMC Gremlin', 'Oil change', 'Tire rotation', '$395.00']) {
			expect(text).toContain(expected);
		}
	});

	it("is a 404 for someone else's car and a 401 for no one", async () => {
		const alice = await signUpAndSignIn();
		const bob = await signUpAndSignIn();
		const vehicleId = await garage(alice);

		expect((await api(`/api/vehicles/${vehicleId}/report`, { cookie: bob.cookie })).status).toBe(
			404
		);
		expect(
			(await api(`/api/vehicles/${vehicleId}/history.csv`, { cookie: bob.cookie })).status
		).toBe(404);
		expect((await api(`/api/vehicles/${vehicleId}/report`)).status).toBe(401);
	});
});

describe('GET /api/vehicles/:id/history.csv', () => {
	it('lists the services oldest first, in dollars, quoting what needs it', async () => {
		const alice = await signUpAndSignIn();
		const vehicleId = await garage(alice);

		const response = await api(`/api/vehicles/${vehicleId}/history.csv`, { cookie: alice.cookie });
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
		expect(response.headers.get('content-disposition')).toBe(
			'attachment; filename="1974-AMC-Gremlin-history.csv"'
		);

		const lines = (await response.text()).trim().split('\r\n');
		expect(lines).toEqual([
			'Date,Service,Status,Mileage,Cost,Vendor,Receipts',
			'2026-03-01,Oil change,Completed,80000,45.00,,0',
			'2026-06-15,"Brake pads, ""front""",Completed,80000,350.00,,0'
		]);
	});
});
