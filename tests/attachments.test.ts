import { describe, expect, it } from 'vitest';
import { api, json, signUpAndSignIn, sql, type TestUser } from './helpers';

/**
 * Receipts on repairs. The rows are tested here; the bytes are not — a test run has
 * no store token, so the upload endpoint answers 503 and the journeys cover the real
 * file when the token is present. What this file guards is the ownership chain
 * (attachment → repair → vehicle → owner), the prefix rule on the URL, and the
 * cascade from the repair.
 */

async function repairFor(user: TestUser): Promise<{ vehicleId: string; repairId: string }> {
	const vehicle = await api('/api/vehicles', {
		method: 'POST',
		body: { make: 'AMC', model: 'Gremlin', year: 1974 },
		cookie: user.cookie
	});
	expect(vehicle.status).toBe(201);
	const vehicleId = (await json<{ vehicle: { id: string } }>(vehicle)).vehicle.id;

	const repair = await api('/api/repairs', {
		method: 'POST',
		body: { vehicleId, description: 'Alignment', date: new Date().toISOString() },
		cookie: user.cookie
	});
	expect(repair.status).toBe(201);
	return { vehicleId, repairId: (await json<{ repair: { id: string } }>(repair)).repair.id };
}

const receipt = (owner: TestUser) => ({
	url: `/api/files/u/${owner.id}/receipt-abc123.pdf`,
	name: 'receipt.pdf',
	contentType: 'application/pdf',
	size: 12345
});

describe('POST /api/repairs/:id/attachments', () => {
	it('refuses a repair that is not yours, and a file that is not yours', async () => {
		const alice = await signUpAndSignIn();
		const bob = await signUpAndSignIn();
		const { repairId } = await repairFor(alice);

		const foreignRepair = await api(`/api/repairs/${repairId}/attachments`, {
			method: 'POST',
			body: receipt(bob),
			cookie: bob.cookie
		});
		expect(foreignRepair.status).toBe(404);

		const foreignFile = await api(`/api/repairs/${repairId}/attachments`, {
			method: 'POST',
			body: receipt(bob),
			cookie: alice.cookie
		});
		expect(foreignFile.status).toBe(400);
		expect(
			await sql(`select count(*) from repair_attachments where repair_id = '${repairId}'`)
		).toBe('0');
	});

	it('hangs a file on the repair, counts it on the cards, and removes it', async () => {
		const alice = await signUpAndSignIn();
		const bob = await signUpAndSignIn();
		const { vehicleId, repairId } = await repairFor(alice);

		const created = await api(`/api/repairs/${repairId}/attachments`, {
			method: 'POST',
			body: receipt(alice),
			cookie: alice.cookie
		});
		expect(created.status).toBe(201);
		const { attachment } = await json<{ attachment: { id: string; url: string } }>(created);
		expect(attachment.url).toBe(receipt(alice).url);

		const detail = await json<{ attachments: { id: string; name: string }[] }>(
			await api(`/api/repairs/${repairId}`, { cookie: alice.cookie })
		);
		expect(detail.attachments.map((a) => [a.id, a.name])).toEqual([[attachment.id, 'receipt.pdf']]);

		const vehicle = await json<{ repairs: { id: string; attachmentCount: number }[] }>(
			await api(`/api/vehicles/${vehicleId}`, { cookie: alice.cookie })
		);
		expect(vehicle.repairs.find((r) => r.id === repairId)?.attachmentCount).toBe(1);
		const list = await json<{ repairs: { id: string; attachmentCount: number }[] }>(
			await api('/api/repairs', { cookie: alice.cookie })
		);
		expect(list.repairs.find((r) => r.id === repairId)?.attachmentCount).toBe(1);

		// Bob cannot see it exists, let alone remove it.
		expect(
			(await api(`/api/attachments/${attachment.id}`, { method: 'DELETE', cookie: bob.cookie }))
				.status
		).toBe(404);
		expect(
			(await api(`/api/attachments/${attachment.id}`, { method: 'DELETE', cookie: alice.cookie }))
				.status
		).toBe(204);
		expect(await sql(`select count(*) from repair_attachments where id = '${attachment.id}'`)).toBe(
			'0'
		);
	});

	it('goes with the repair', async () => {
		const alice = await signUpAndSignIn();
		const { repairId } = await repairFor(alice);
		await api(`/api/repairs/${repairId}/attachments`, {
			method: 'POST',
			body: receipt(alice),
			cookie: alice.cookie
		});

		expect(
			(await api(`/api/repairs/${repairId}`, { method: 'DELETE', cookie: alice.cookie })).status
		).toBe(204);
		expect(
			await sql(`select count(*) from repair_attachments where repair_id = '${repairId}'`)
		).toBe('0');
	});
});
