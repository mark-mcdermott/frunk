import { and, arrayContains, eq, inArray, isNull, lt, not, or } from 'drizzle-orm';
import { RP_ORIGIN } from 'astro:env/server';
import {
	assess,
	assessExpirations,
	describeDeadline,
	describeDue,
	type Assessment,
	type ExpirationKind
} from '../maintenance';
import { ROLE_IDS } from '../roles';
import { getDb } from './db';
import * as table from './db/schema';
import { sendEmail, type EmailMessage } from './email';

/**
 * The maintenance digest: one email per person per day, only when something is
 * overdue or due soon, and only once per due cycle.
 *
 * Two kinds of thing are due. A **schedule** is told once per completion:
 * `reminderSentAt` is stamped when a digest goes out and cleared whenever the schedule
 * is completed. A **renewal** (registration, inspection, emissions, insurance) has no
 * completion, only a date that moves; `expiration_reminders` records the date each
 * one was last mailed about, and a changed date is a new cycle. Either way a thing
 * that stays overdue is mentioned once, not every morning until someone gives in.
 *
 * Who gets mail is decided in the query — a verified address, reminders left on, and
 * not a demo, whose placeholder address would only bounce — and whether something is
 * due is decided by `assess` / `assessDeadline`, the same rules the screens use.
 */

interface DueBase {
	name: string;
	vehicleId: string;
	vehicleLabel: string;
	assessment: Assessment;
}

export type DueItem =
	| (DueBase & { kind: 'schedule'; scheduleId: string })
	| (DueBase & { kind: 'expiration'; expiration: ExpirationKind; expiresOn: Date });

export interface Digest {
	userId: string;
	email: string;
	name: string;
	items: DueItem[];
}

const ORDER: Record<Assessment['state'], number> = { overdue: 0, 'due-soon': 1, ok: 2, unknown: 3 };

const isDue = (assessment: Assessment) =>
	assessment.state === 'overdue' || assessment.state === 'due-soon';

/** The accounts the digest may write to. */
const mailable = and(
	eq(table.user.emailVerified, true),
	eq(table.user.remindersByEmail, true),
	not(arrayContains(table.user.roles, [ROLE_IDS.DEMO]))
);

const vehicleColumns = {
	id: table.vehicles.id,
	year: table.vehicles.year,
	make: table.vehicles.make,
	model: table.vehicles.model,
	nickname: table.vehicles.nickname,
	currentMileage: table.vehicles.currentMileage,
	registrationExpiration: table.vehicles.registrationExpiration,
	inspectionExpiration: table.vehicles.inspectionExpiration,
	emissionsExpiration: table.vehicles.emissionsExpiration,
	insuranceExpiration: table.vehicles.insuranceExpiration
};
const userColumns = { id: table.user.id, email: table.user.email, name: table.user.name };

const label = (vehicle: { year: number; make: string; model: string; nickname: string | null }) =>
	vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

export async function collectDigests(now: Date = new Date()): Promise<Digest[]> {
	const db = getDb();

	const [schedules, vehicles] = await Promise.all([
		db
			.select({ schedule: table.maintenanceSchedules, vehicle: vehicleColumns, user: userColumns })
			.from(table.maintenanceSchedules)
			.innerJoin(table.vehicles, eq(table.maintenanceSchedules.vehicleId, table.vehicles.id))
			.innerJoin(table.user, eq(table.vehicles.userId, table.user.id))
			.where(
				and(
					mailable,
					or(
						isNull(table.maintenanceSchedules.reminderSentAt),
						lt(
							table.maintenanceSchedules.reminderSentAt,
							table.maintenanceSchedules.lastCompletedDate
						)
					)
				)
			),
		db
			.select({ vehicle: vehicleColumns, user: userColumns })
			.from(table.vehicles)
			.innerJoin(table.user, eq(table.vehicles.userId, table.user.id))
			.where(mailable)
	]);

	const told = vehicles.length
		? await db
				.select()
				.from(table.expirationReminders)
				.where(
					inArray(
						table.expirationReminders.vehicleId,
						vehicles.map(({ vehicle }) => vehicle.id)
					)
				)
		: [];
	const toldFor = new Map(
		told.map((row) => [`${row.vehicleId}:${row.kind}`, row.sentFor.getTime()])
	);

	const byUser = new Map<string, Digest>();
	const add = (user: { id: string; email: string; name: string }, item: DueItem) => {
		const digest = byUser.get(user.id) ?? {
			userId: user.id,
			email: user.email,
			name: user.name,
			items: []
		};
		digest.items.push(item);
		byUser.set(user.id, digest);
	};

	for (const { schedule, vehicle, user } of schedules) {
		const assessment = assess(schedule, vehicle.currentMileage, now);
		if (!isDue(assessment)) continue;
		add(user, {
			kind: 'schedule',
			scheduleId: schedule.id,
			name: schedule.name,
			vehicleId: vehicle.id,
			vehicleLabel: label(vehicle),
			assessment
		});
	}

	for (const { vehicle, user } of vehicles) {
		for (const { expiration, expiresOn, assessment } of assessExpirations(vehicle, now)) {
			if (!isDue(assessment)) continue;
			// Already told about this exact date: silent until the date moves.
			if (toldFor.get(`${vehicle.id}:${expiration.kind}`) === expiresOn.getTime()) continue;
			add(user, {
				kind: 'expiration',
				expiration: expiration.kind,
				expiresOn,
				name: expiration.label,
				vehicleId: vehicle.id,
				vehicleLabel: label(vehicle),
				assessment
			});
		}
	}

	for (const digest of byUser.values()) {
		digest.items.sort(
			(a, b) =>
				ORDER[a.assessment.state] - ORDER[b.assessment.state] ||
				a.vehicleLabel.localeCompare(b.vehicleLabel) ||
				a.name.localeCompare(b.name)
		);
	}

	return [...byUser.values()];
}

const describe = (item: DueItem) =>
	item.kind === 'schedule' ? describeDue(item.assessment) : describeDeadline(item.assessment);

const escapeHtml = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Where the links point. Production pins `RP_ORIGIN`; anywhere else is a rehearsal. */
const origin = () => RP_ORIGIN ?? 'https://frunk.cloud';

export function renderDigest(digest: Digest): EmailMessage {
	const base = origin();
	const overdue = digest.items.filter((item) => item.assessment.state === 'overdue').length;
	const count = digest.items.length;
	const [first] = digest.items;

	const subject =
		count === 1 && first
			? `${first.name} is ${overdue ? (first.kind === 'expiration' ? 'expired' : 'overdue') : first.kind === 'expiration' ? 'expiring soon' : 'due soon'} on your ${first.vehicleLabel}`
			: `${count} things in your garage ${overdue ? 'need attention' : 'are due soon'}`;

	const byVehicle = new Map<string, DueItem[]>();
	for (const item of digest.items) {
		byVehicle.set(item.vehicleId, [...(byVehicle.get(item.vehicleId) ?? []), item]);
	}

	const textBlocks: string[] = [];
	const htmlBlocks: string[] = [];
	for (const items of byVehicle.values()) {
		const { vehicleId, vehicleLabel } = items[0]!;
		const link = `${base}/vehicles/${vehicleId}`;
		textBlocks.push(
			[
				vehicleLabel,
				...items.map((item) => `  - ${item.name}: ${describe(item)}`),
				`  ${link}`
			].join('\n')
		);
		htmlBlocks.push(
			`<p style="margin:20px 0 6px"><a href="${link}" style="color:#6438cc;font-weight:600;text-decoration:none">${escapeHtml(vehicleLabel)}</a></p>` +
				`<ul style="margin:0;padding-left:20px">${items
					.map(
						(item) =>
							`<li style="margin:4px 0"><strong>${escapeHtml(item.name)}</strong> — ${escapeHtml(describe(item))}</li>`
					)
					.join('')}</ul>`
		);
	}

	const intro =
		count === 1
			? 'One thing in your garage needs attention:'
			: 'Some things in your garage need attention:';

	const text = [
		`Hi ${digest.name},`,
		'',
		intro,
		'',
		...textBlocks,
		'',
		'Mark each service done from the vehicle page once it is taken care of, and update a renewal date once it is renewed.',
		`Turn these reminders off any time: ${base}/profile`
	].join('\n');

	const html = `
		<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#0b0f18;max-width:560px">
			<p style="margin:0 0 4px">Hi ${escapeHtml(digest.name)},</p>
			<p style="margin:0">${intro}</p>
			${htmlBlocks.join('')}
			<p style="margin:24px 0 0;color:#5b6472">Mark each service done from the vehicle page once it is taken care of, and update a renewal date once it is renewed.</p>
			<p style="margin:8px 0 0;font-size:13px;color:#8b93a1">Turn these reminders off any time on <a href="${base}/profile" style="color:#8b93a1">your profile</a>.</p>
		</div>
	`.trim();

	return { to: digest.email, subject, html, text };
}

export interface DigestRun {
	sent: number;
	failed: number;
}

/** Records what a digest mentioned, so the next run stays quiet about it. */
async function stamp(digest: Digest, now: Date): Promise<void> {
	const db = getDb();

	const scheduleIds = digest.items.flatMap((item) =>
		item.kind === 'schedule' ? [item.scheduleId] : []
	);
	if (scheduleIds.length) {
		await db
			.update(table.maintenanceSchedules)
			.set({ reminderSentAt: now })
			.where(inArray(table.maintenanceSchedules.id, scheduleIds));
	}

	const renewals = digest.items.flatMap((item) =>
		item.kind === 'expiration'
			? [{ vehicleId: item.vehicleId, kind: item.expiration, sentFor: item.expiresOn, sentAt: now }]
			: []
	);
	if (renewals.length) {
		await db
			.insert(table.expirationReminders)
			.values(renewals)
			.onConflictDoUpdate({
				target: [table.expirationReminders.vehicleId, table.expirationReminders.kind],
				set: { sentFor: table.expirationReminders.sentFor, sentAt: now }
			});
	}
}

/** Sends every due digest and records what each mentioned; a failed send records nothing. */
export async function sendMaintenanceDigests(now: Date = new Date()): Promise<DigestRun> {
	const digests = await collectDigests(now);
	let sent = 0;
	let failed = 0;

	for (const digest of digests) {
		try {
			await sendEmail(renderDigest(digest));
			await stamp(digest, now);
			sent += 1;
		} catch (cause) {
			failed += 1;
			console.error(`Maintenance digest to user ${digest.userId} failed:`, cause);
		}
	}

	return { sent, failed };
}
