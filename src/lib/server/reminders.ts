import { eq, inArray, isNull, lt, or } from 'drizzle-orm';
import { RP_ORIGIN } from 'astro:env/server';
import {
	assess,
	assessExpirations,
	describeDeadline,
	describeDue,
	type Assessment,
	type ExpirationKind
} from '../maintenance';
import { isDemo } from '../roles';
import { getDb } from './db';
import * as table from './db/schema';
import { emailConfigured, sendEmail, type EmailMessage } from './email';
import { pushConfigured, sendPush, type PushMessage } from './push';

/**
 * The maintenance digest: at most one message per person per day, only when something
 * is overdue or due soon, and only once per due cycle.
 *
 * Two kinds of thing are due. A **schedule** is told once per completion:
 * `reminderSentAt` is stamped when a digest goes out and cleared whenever the schedule
 * is completed. A **renewal** (registration, inspection, emissions, insurance) has no
 * completion, only a date that moves; `expiration_reminders` records the date each
 * one was last told about, and a changed date is a new cycle. Either way a thing that
 * stays overdue is mentioned once, not every morning until someone gives in.
 *
 * **Two channels.** Email goes to a verified address with reminders left on, and never
 * to a demo, whose placeholder address would only bounce. A push goes to every phone
 * the person registered from the app (`device_tokens`) — asking for that is the opt-in,
 * so a demo that asked gets it too. A digest counts as delivered, and is recorded, when
 * either channel got through; a person reachable by neither is not in the run at all.
 * Whether something is due is decided by `assess` / `assessDeadline`, the same rules the
 * screens use.
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
	/** Where the email goes; `null` when this person is not to be mailed. */
	email: string | null;
	name: string;
	/** The phones to notify. */
	tokens: string[];
	items: DueItem[];
}

const ORDER: Record<Assessment['state'], number> = { overdue: 0, 'due-soon': 1, ok: 2, unknown: 3 };

const isDue = (assessment: Assessment) =>
	assessment.state === 'overdue' || assessment.state === 'due-soon';

interface Recipient {
	id: string;
	email: string;
	name: string;
	emailVerified: boolean;
	remindersByEmail: boolean;
	roles: number[];
}

const mailable = (user: Recipient) =>
	user.emailVerified && user.remindersByEmail && !isDemo(user.roles);

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
const userColumns = {
	id: table.user.id,
	email: table.user.email,
	name: table.user.name,
	emailVerified: table.user.emailVerified,
	remindersByEmail: table.user.remindersByEmail,
	roles: table.user.roles
};

const label = (vehicle: { year: number; make: string; model: string; nickname: string | null }) =>
	vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

export async function collectDigests(now: Date = new Date()): Promise<Digest[]> {
	const db = getDb();

	const [schedules, vehicles, devices] = await Promise.all([
		db
			.select({ schedule: table.maintenanceSchedules, vehicle: vehicleColumns, user: userColumns })
			.from(table.maintenanceSchedules)
			.innerJoin(table.vehicles, eq(table.maintenanceSchedules.vehicleId, table.vehicles.id))
			.innerJoin(table.user, eq(table.vehicles.userId, table.user.id))
			.where(
				or(
					isNull(table.maintenanceSchedules.reminderSentAt),
					lt(
						table.maintenanceSchedules.reminderSentAt,
						table.maintenanceSchedules.lastCompletedDate
					)
				)
			),
		db
			.select({ vehicle: vehicleColumns, user: userColumns })
			.from(table.vehicles)
			.innerJoin(table.user, eq(table.vehicles.userId, table.user.id)),
		db
			.select({ userId: table.deviceTokens.userId, token: table.deviceTokens.token })
			.from(table.deviceTokens)
	]);

	const tokensOf = new Map<string, string[]>();
	for (const { userId, token } of devices) {
		tokensOf.set(userId, [...(tokensOf.get(userId) ?? []), token]);
	}
	/** Someone with no way to be told is not part of the run. */
	const reachable = (user: Recipient) => mailable(user) || tokensOf.has(user.id);

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
	const add = (user: Recipient, item: DueItem) => {
		if (!reachable(user)) return;
		const digest = byUser.get(user.id) ?? {
			userId: user.id,
			email: mailable(user) ? user.email : null,
			name: user.name,
			tokens: tokensOf.get(user.id) ?? [],
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

/** "is overdue" / "is expiring soon" — the verb a single item's headline needs. */
function headline(item: DueItem): string {
	const overdue = item.assessment.state === 'overdue';
	if (item.kind === 'expiration') return overdue ? 'has expired' : 'is expiring soon';
	return overdue ? 'is overdue' : 'is due soon';
}

const escapeHtml = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Where the links point. Production pins `RP_ORIGIN`; anywhere else is a rehearsal. */
const origin = () => RP_ORIGIN ?? 'https://frunk.cloud';

export function renderDigest(digest: Digest & { email: string }): EmailMessage {
	const base = origin();
	const overdue = digest.items.some((item) => item.assessment.state === 'overdue');
	const count = digest.items.length;
	const [first] = digest.items;

	const subject =
		count === 1 && first
			? `${first.name} ${headline(first)} on your ${first.vehicleLabel}`
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
	const closing =
		'Mark each service done from the vehicle page once it is taken care of, and update a renewal date once it is renewed.';

	const text = [
		`Hi ${digest.name},`,
		'',
		intro,
		'',
		...textBlocks,
		'',
		closing,
		`Turn these reminders off any time: ${base}/profile`
	].join('\n');

	const html = `
		<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#0b0f18;max-width:560px">
			<p style="margin:0 0 4px">Hi ${escapeHtml(digest.name)},</p>
			<p style="margin:0">${intro}</p>
			${htmlBlocks.join('')}
			<p style="margin:24px 0 0;color:#5b6472">${closing}</p>
			<p style="margin:8px 0 0;font-size:13px;color:#8b93a1">Turn these reminders off any time on <a href="${base}/profile" style="color:#8b93a1">your profile</a>.</p>
		</div>
	`.trim();

	return { to: digest.email, subject, html, text };
}

/**
 * The same digest, at the size of a lock screen: one item says what and where, several
 * say how many and name the first two. `vehicleId` rides along so a tap opens that car.
 */
export function renderPush(digest: Digest): PushMessage {
	const [first, second] = digest.items;
	const count = digest.items.length;
	if (!first) return { title: 'Frunk', body: 'Nothing is due.' };

	const data = { vehicleId: first.vehicleId };
	if (count === 1) {
		return {
			title: `${first.name} ${headline(first)}`,
			body: `${first.vehicleLabel} · ${describe(first)}`,
			data
		};
	}

	const named = [first, second]
		.filter((item): item is DueItem => Boolean(item))
		.map((item) => `${item.name} (${item.vehicleLabel})`)
		.join(', ');
	return {
		title: `${count} things in your garage need attention`,
		body: count > 2 ? `${named} and ${count - 2} more` : named,
		data
	};
}

export interface DigestRun {
	/** People told, by at least one channel. */
	sent: number;
	/** People a configured channel tried to reach and could not. */
	failed: number;
	/** People whose only channels are not configured on this deployment. */
	skipped: number;
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

	for (const item of digest.items) {
		if (item.kind !== 'expiration') continue;
		await db
			.insert(table.expirationReminders)
			.values({
				vehicleId: item.vehicleId,
				kind: item.expiration,
				sentFor: item.expiresOn,
				sentAt: now
			})
			.onConflictDoUpdate({
				target: [table.expirationReminders.vehicleId, table.expirationReminders.kind],
				set: { sentFor: item.expiresOn, sentAt: now }
			});
	}
}

/** Pushes to every phone on the digest; tokens Apple says are gone are forgotten. */
async function pushTo(digest: Digest): Promise<boolean> {
	const message = renderPush(digest);
	const outcomes = await Promise.all(digest.tokens.map((token) => sendPush(token, message)));

	const gone = digest.tokens.filter((_, index) => outcomes[index] === 'gone');
	if (gone.length) {
		await getDb().delete(table.deviceTokens).where(inArray(table.deviceTokens.token, gone));
	}
	return outcomes.includes('sent');
}

/**
 * Tells everyone who is due to be told, by every channel this deployment has, and
 * records what each was told; a person no channel reached keeps their place in the
 * next run.
 */
export async function sendMaintenanceDigests(now: Date = new Date()): Promise<DigestRun> {
	const digests = await collectDigests(now);
	const run: DigestRun = { sent: 0, failed: 0, skipped: 0 };

	for (const digest of digests) {
		const byEmail = digest.email !== null && emailConfigured();
		const byPush = digest.tokens.length > 0 && pushConfigured();
		if (!byEmail && !byPush) {
			run.skipped += 1;
			continue;
		}

		let delivered = false;
		if (byPush) delivered = await pushTo(digest);
		if (byEmail) {
			try {
				await sendEmail(renderDigest({ ...digest, email: digest.email as string }));
				delivered = true;
			} catch (cause) {
				console.error(`Maintenance digest email to user ${digest.userId} failed:`, cause);
			}
		}

		if (delivered) {
			await stamp(digest, now);
			run.sent += 1;
		} else {
			run.failed += 1;
		}
	}

	return run;
}
