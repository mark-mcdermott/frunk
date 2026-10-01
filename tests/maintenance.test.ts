import { beforeAll, describe, expect, it } from 'vitest';
import {
	addMonths,
	assess,
	assessDeadline,
	describeDeadline,
	describeDue
} from '../src/lib/maintenance';
import { api, json, signUpAndSignIn, sql, startDemo, type TestUser } from './helpers';

/**
 * Maintenance reminders: the due rule, the "mark done" endpoint, repairs that count
 * toward a schedule, the garage's badge counts and the digest's selection.
 *
 * The rule (`assess`) is pure and tested as a function; everything that touches a
 * row is tested over HTTP with the column read back from Postgres, like the rest of
 * the suite. The digest is exercised through `?dryRun=1`, which selects and renders
 * nothing else. The test run has no mail provider, so a real run must leave a person it
 * can only mail untouched rather than pretend; `push.test.ts` covers the channel that
 * is configured here.
 */

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);
const iso = (date: Date) => date.toISOString();

describe('assess', () => {
	const now = new Date('2026-09-22T12:00:00Z');
	const terms = (over: Partial<Parameters<typeof assess>[0]>) => ({
		intervalMiles: null,
		intervalMonths: null,
		lastCompletedDate: null,
		lastCompletedMileage: null,
		...over
	});

	it('is unknown with nothing to count from', () => {
		expect(assess(terms({ intervalMiles: 5000 }), 40000, now).state).toBe('unknown');
		// A mileage target with no odometer reading is unknown too, but names the target.
		const a = assess(terms({ intervalMiles: 5000, lastCompletedMileage: 40000 }), null, now);
		expect(a).toMatchObject({ state: 'unknown', dueMileage: 45000, milesLeft: null });
		expect(describeDue(a)).toMatch(/^Due at 45,000 mi/);
	});

	it('counts miles', () => {
		const at = (odometer: number) =>
			assess(terms({ intervalMiles: 5000, lastCompletedMileage: 40000 }), odometer, now);
		expect(at(41000)).toMatchObject({ state: 'ok', milesLeft: 4000 });
		expect(at(44600)).toMatchObject({ state: 'due-soon', milesLeft: 400 });
		expect(at(45300)).toMatchObject({ state: 'overdue', milesLeft: -300 });
		expect(describeDue(at(45300))).toBe('Overdue by 300 mi');
	});

	it('counts months, clamped to the shorter month', () => {
		const from = (lastCompletedDate: Date) =>
			assess(terms({ intervalMonths: 6, lastCompletedDate }), null, now);
		expect(from(new Date('2026-08-01T12:00:00Z'))).toMatchObject({ state: 'ok' });
		expect(from(new Date('2026-04-01T12:00:00Z'))).toMatchObject({
			state: 'due-soon',
			daysLeft: 9
		});
		expect(from(new Date('2026-03-01T12:00:00Z'))).toMatchObject({
			state: 'overdue',
			daysLeft: -21
		});
		expect(addMonths(new Date('2026-01-31T00:00:00'), 1).getDate()).toBe(28);
	});

	it('lets whichever interval runs out first decide', () => {
		const both = assess(
			terms({
				intervalMiles: 5000,
				intervalMonths: 6,
				lastCompletedDate: new Date('2026-09-01T12:00:00Z'),
				lastCompletedMileage: 40000
			}),
			45200,
			now
		);
		expect(both.state).toBe('overdue');
		expect(describeDue(both)).toBe('Overdue by 200 mi');
	});
});

describe('assessDeadline', () => {
	const now = new Date('2026-09-22T12:00:00Z');
	const at = (date: string | null) => assessDeadline(date, now);

	it('treats a renewal date like a schedule with no interval', () => {
		expect(at(null)).toMatchObject({ state: 'unknown', daysLeft: null });
		expect(describeDeadline(at(null))).toBe('No date');
		expect(at('2027-03-01T00:00:00Z')).toMatchObject({ state: 'ok' });
		expect(at('2026-10-10T00:00:00Z')).toMatchObject({ state: 'due-soon', daysLeft: 18 });
		expect(describeDeadline(at('2026-10-10T00:00:00Z'))).toBe('Expires in 18 days');
		// Dates are stored at midnight; by noon that day it is "today", not "in 1 day".
		expect(describeDeadline(at('2026-09-22T00:00:00Z'))).toBe('Expires today');
		expect(at('2026-09-19T00:00:00Z')).toMatchObject({ state: 'overdue', daysLeft: -3 });
		expect(describeDeadline(at('2026-09-19T00:00:00Z'))).toBe('Expired 3 days ago');
	});
});

interface Schedule {
	id: string;
	lastCompletedDate: string | null;
	lastCompletedMileage: number | null;
}

async function garage(user: TestUser, currentMileage: number | null = 40000) {
	const created = await api('/api/vehicles', {
		method: 'POST',
		body: { make: 'AMC', model: 'Gremlin', year: 1974, currentMileage },
		cookie: user.cookie
	});
	expect(created.status).toBe(201);
	const { vehicle } = await json<{ vehicle: { id: string } }>(created);

	const scheduled = await api('/api/maintenance-schedules', {
		method: 'POST',
		body: { vehicleId: vehicle.id, name: 'Oil change', intervalMiles: 5000, intervalMonths: 6 },
		cookie: user.cookie
	});
	expect(scheduled.status).toBe(201);
	const { schedule } = await json<{ schedule: Schedule }>(scheduled);

	return { vehicleId: vehicle.id, scheduleId: schedule.id };
}

const lastDone = (scheduleId: string) =>
	sql(
		`select coalesce(to_char(last_completed_date at time zone 'UTC', 'YYYY-MM-DD'), '<null>') || '|' || coalesce(last_completed_mileage::text, '<null>') from maintenance_schedules where id = '${scheduleId}'`
	);
const ymd = (date: Date) => iso(date).slice(0, 10);

describe('POST /api/maintenance-schedules/:id/complete', () => {
	it("answers 404 for someone else's schedule", async () => {
		const alice = await signUpAndSignIn();
		const bob = await signUpAndSignIn();
		const { scheduleId } = await garage(alice);

		const response = await api(`/api/maintenance-schedules/${scheduleId}/complete`, {
			method: 'POST',
			body: { date: iso(new Date()), mileage: 41000 },
			cookie: bob.cookie
		});
		expect(response.status).toBe(404);
		expect(await lastDone(scheduleId)).toBe('<null>|<null>');
	});

	it('moves last done, moves the odometer forward, and logs the repair', async () => {
		const alice = await signUpAndSignIn();
		const { vehicleId, scheduleId } = await garage(alice, 40000);
		const today = new Date();

		const response = await api(`/api/maintenance-schedules/${scheduleId}/complete`, {
			method: 'POST',
			body: { date: iso(today), mileage: 41250, cost: 4500 },
			cookie: alice.cookie
		});
		expect(response.status).toBe(200);
		const body = await json<{
			schedule: Schedule;
			repair: { id: string; scheduleId: string; status: string } | null;
			currentMileage: number;
		}>(response);
		expect(body.currentMileage).toBe(41250);
		expect(body.repair).toMatchObject({ scheduleId, status: 'completed' });

		expect(await lastDone(scheduleId)).toBe(`${ymd(today)}|41250`);
		expect(await sql(`select current_mileage from vehicles where id = '${vehicleId}'`)).toBe(
			'41250'
		);
		expect(
			await sql(
				`select description || '|' || mileage || '|' || cost from repairs where schedule_id = '${scheduleId}'`
			)
		).toBe('Oil change|41250|4500');
	});

	it('logs a backfill without moving last done backwards, and can skip the repair', async () => {
		const alice = await signUpAndSignIn();
		const { vehicleId, scheduleId } = await garage(alice, 40000);
		const today = new Date();

		const complete = (body: Record<string, unknown>) =>
			api(`/api/maintenance-schedules/${scheduleId}/complete`, {
				method: 'POST',
				body,
				cookie: alice.cookie
			});

		expect((await complete({ date: iso(today), mileage: 41000, logRepair: false })).status).toBe(
			200
		);
		expect(await sql(`select count(*) from repairs where vehicle_id = '${vehicleId}'`)).toBe('0');

		// Six months ago at fewer miles: history, not the latest completion.
		expect((await complete({ date: iso(daysAgo(180)), mileage: 36000 })).status).toBe(200);
		expect(await lastDone(scheduleId)).toBe(`${ymd(today)}|41000`);
		expect(await sql(`select mileage from repairs where schedule_id = '${scheduleId}'`)).toBe(
			'36000'
		);
		// The odometer never goes backwards either.
		expect(await sql(`select current_mileage from vehicles where id = '${vehicleId}'`)).toBe(
			'41000'
		);
	});
});

describe('repairs that count toward a schedule', () => {
	it('refuses a schedule on another vehicle, and 404s one that is not yours', async () => {
		const alice = await signUpAndSignIn();
		const bob = await signUpAndSignIn();
		const mine = await garage(alice);
		const other = await garage(alice);
		const theirs = await garage(bob);

		const log = (vehicleId: string, scheduleId: string) =>
			api('/api/repairs', {
				method: 'POST',
				body: { vehicleId, description: 'Oil change', date: iso(new Date()), scheduleId },
				cookie: alice.cookie
			});

		expect((await log(mine.vehicleId, other.scheduleId)).status).toBe(400);
		expect((await log(mine.vehicleId, theirs.scheduleId)).status).toBe(404);
		expect((await log(mine.vehicleId, mine.scheduleId)).status).toBe(201);
	});

	it('follows the repair through its life', async () => {
		const alice = await signUpAndSignIn();
		const { vehicleId, scheduleId } = await garage(alice);
		const first = daysAgo(90);
		const second = daysAgo(10);

		const created = await api('/api/repairs', {
			method: 'POST',
			body: {
				vehicleId,
				description: 'Oil change',
				date: iso(first),
				mileage: 38000,
				scheduleId
			},
			cookie: alice.cookie
		});
		expect(created.status).toBe(201);
		const { repair } = await json<{ repair: { id: string } }>(created);
		expect(await lastDone(scheduleId)).toBe(`${ymd(first)}|38000`);

		const patch = (body: Record<string, unknown>) =>
			api(`/api/repairs/${repair.id}`, { method: 'PATCH', body, cookie: alice.cookie });

		// Not completed after all: nothing else counts, so last done clears.
		expect((await patch({ status: 'scheduled' })).status).toBe(200);
		expect(await lastDone(scheduleId)).toBe('<null>|<null>');

		// Completed again, on a later date: the new date is what counts.
		expect((await patch({ status: 'completed', date: iso(second), mileage: 39500 })).status).toBe(
			200
		);
		expect(await lastDone(scheduleId)).toBe(`${ymd(second)}|39500`);

		// A manual completion later still is never overtaken by the older repair.
		const today = new Date();
		await api(`/api/maintenance-schedules/${scheduleId}/complete`, {
			method: 'POST',
			body: { date: iso(today), mileage: 40000, logRepair: false },
			cookie: alice.cookie
		});
		expect((await patch({ mileage: 39600 })).status).toBe(200);
		expect(await lastDone(scheduleId)).toBe(`${ymd(today)}|40000`);

		// Deleting a repair that was not the last completion changes nothing.
		expect(
			(await api(`/api/repairs/${repair.id}`, { method: 'DELETE', cookie: alice.cookie })).status
		).toBe(204);
		expect(await lastDone(scheduleId)).toBe(`${ymd(today)}|40000`);
	});

	it('hands last done to the next repair when the latest is deleted', async () => {
		const alice = await signUpAndSignIn();
		const { vehicleId, scheduleId } = await garage(alice);

		const log = async (date: Date, mileage: number) => {
			const response = await api('/api/repairs', {
				method: 'POST',
				body: { vehicleId, description: 'Oil change', date: iso(date), mileage, scheduleId },
				cookie: alice.cookie
			});
			expect(response.status).toBe(201);
			return (await json<{ repair: { id: string } }>(response)).repair.id;
		};

		await log(daysAgo(200), 35000);
		const latest = await log(daysAgo(20), 39000);
		expect(await lastDone(scheduleId)).toBe(`${ymd(daysAgo(20))}|39000`);

		await api(`/api/repairs/${latest}`, { method: 'DELETE', cookie: alice.cookie });
		expect(await lastDone(scheduleId)).toBe(`${ymd(daysAgo(200))}|35000`);
	});
});

describe('GET /api/vehicles', () => {
	it('badges each vehicle with its due counts', async () => {
		const alice = await signUpAndSignIn();
		const { vehicleId, scheduleId } = await garage(alice, 50000);
		const quiet = await garage(alice, 10000);

		// Last done 6,000 miles ago on a 5,000-mile interval: overdue.
		await api(`/api/maintenance-schedules/${scheduleId}`, {
			method: 'PATCH',
			body: { lastCompletedDate: iso(daysAgo(30)), lastCompletedMileage: 44000 },
			cookie: alice.cookie
		});

		const { vehicles } = await json<{
			vehicles: { id: string; maintenance: { overdue: number; dueSoon: number } }[];
		}>(await api('/api/vehicles', { cookie: alice.cookie }));

		expect(vehicles.find((v) => v.id === vehicleId)?.maintenance).toEqual({
			overdue: 1,
			dueSoon: 0
		});
		expect(vehicles.find((v) => v.id === quiet.vehicleId)?.maintenance).toEqual({
			overdue: 0,
			dueSoon: 0
		});
	});

	it('counts renewal dates alongside schedules', async () => {
		const alice = await signUpAndSignIn();
		const { vehicleId } = await garage(alice, 10000);

		const patched = await api(`/api/vehicles/${vehicleId}`, {
			method: 'PATCH',
			body: {
				registrationExpiration: iso(daysAgo(5)),
				inspectionExpiration: iso(daysAgo(-10)),
				insuranceExpiration: iso(daysAgo(-200))
			},
			cookie: alice.cookie
		});
		expect(patched.status).toBe(200);

		const { vehicles } = await json<{
			vehicles: { id: string; maintenance: { overdue: number; dueSoon: number } }[];
		}>(await api('/api/vehicles', { cookie: alice.cookie }));
		expect(vehicles.find((v) => v.id === vehicleId)?.maintenance).toEqual({
			overdue: 1,
			dueSoon: 1
		});
	});
});

describe('GET /api/cron/maintenance-digest', () => {
	const SECRET = process.env.CRON_SECRET ?? '';
	const PATH = '/api/cron/maintenance-digest';

	/** `null` sends no header at all; the default is the real secret. */
	const digest = (query = '', authorization: string | null = `Bearer ${SECRET}`) =>
		fetch(`${process.env.TEST_BASE}${PATH}${query}`, {
			headers: authorization === null ? {} : { authorization }
		});

	interface DryRun {
		dryRun: true;
		digests: {
			userId: string;
			items: {
				kind: 'schedule' | 'expiration';
				scheduleId?: string;
				expiration?: string;
				vehicleId: string;
				state: string;
			}[];
		}[];
	}
	const planFor = async (userId: string) =>
		(await json<DryRun>(await digest('?dryRun=1'))).digests.find((d) => d.userId === userId);

	let alice: TestUser;
	let scheduleId: string;

	beforeAll(async () => {
		// Each file mints its own demo against a limit of three an hour; the demo
		// limiter is not under test here, so its bucket is cleared (as reaper.test.ts does).
		await sql(`delete from auth_rate_limits where key like 'demo:%'`);
		alice = await signUpAndSignIn();
		({ scheduleId } = await garage(alice, 50000));
		await api(`/api/maintenance-schedules/${scheduleId}`, {
			method: 'PATCH',
			body: { lastCompletedDate: iso(daysAgo(30)), lastCompletedMileage: 44000 },
			cookie: alice.cookie
		});
	});

	it('refuses a request without the secret', async () => {
		expect((await digest('', null)).status).toBe(401);
		expect((await digest('?dryRun=1', 'Bearer not-the-secret')).status).toBe(401);
	});

	it('plans a mail for a verified account with something overdue', async () => {
		expect(await planFor(alice.id)).toMatchObject({
			items: [{ scheduleId, state: 'overdue' }]
		});
	});

	it('leaves out demo accounts, opted-out accounts and schedules already mailed about', async () => {
		// The demo garage is seeded overdue too, but its placeholder address would bounce.
		const demo = await startDemo();
		expect(await planFor(demo.id)).toBeUndefined();

		const optOut = await api('/api/auth/update-user', {
			method: 'POST',
			body: { remindersByEmail: false },
			cookie: alice.cookie
		});
		expect(optOut.status).toBe(200);
		expect(await sql(`select reminders_by_email from "user" where id = '${alice.id}'`)).toBe('f');
		expect(await planFor(alice.id)).toBeUndefined();

		await api('/api/auth/update-user', {
			method: 'POST',
			body: { remindersByEmail: true },
			cookie: alice.cookie
		});
		expect(await planFor(alice.id)).toBeDefined();

		// Mailed about since it was last done: silent until it is done again.
		await sql(
			`update maintenance_schedules set reminder_sent_at = now() where id = '${scheduleId}'`
		);
		expect(await planFor(alice.id)).toBeUndefined();

		await api(`/api/maintenance-schedules/${scheduleId}/complete`, {
			method: 'POST',
			body: { date: iso(daysAgo(30)), mileage: 44000, logRepair: false },
			cookie: alice.cookie
		});
		expect(await planFor(alice.id)).toBeDefined();
	});

	it('mentions a renewal once per date, and again when the date moves', async () => {
		const { vehicleId } = await garage(alice, 10000);
		const renew = (registrationExpiration: string) =>
			api(`/api/vehicles/${vehicleId}`, {
				method: 'PATCH',
				body: { registrationExpiration },
				cookie: alice.cookie
			});
		const registration = async () =>
			(await planFor(alice.id))?.items.find(
				(item) => item.vehicleId === vehicleId && item.kind === 'expiration'
			);

		const expired = daysAgo(3);
		expect((await renew(iso(expired))).status).toBe(200);
		expect(await registration()).toMatchObject({ expiration: 'registration', state: 'overdue' });

		// Told about this date already: quiet.
		await sql(
			`insert into expiration_reminders (vehicle_id, kind, sent_for) values ('${vehicleId}', 'registration', '${iso(expired)}')`
		);
		expect(await registration()).toBeUndefined();

		// Renewed, and the new date is inside the window: that is a new cycle.
		expect((await renew(iso(daysAgo(-10)))).status).toBe(200);
		expect(await registration()).toMatchObject({ expiration: 'registration', state: 'due-soon' });
	});

	it('leaves alone anyone it has no way to reach', async () => {
		// The test run has no mail provider, and this account registered no phone: the
		// run answers, counts the person as skipped, and records nothing as told.
		const run = await digest();
		expect(run.status).toBe(200);
		expect((await json<{ skipped: number }>(run)).skipped).toBeGreaterThan(0);
		expect(
			await sql(
				`select reminder_sent_at is null from maintenance_schedules where id = '${scheduleId}'`
			)
		).toBe('t');
	});
});
