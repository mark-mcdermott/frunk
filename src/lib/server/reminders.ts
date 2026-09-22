import { and, arrayContains, eq, inArray, isNull, lt, not, or } from 'drizzle-orm';
import { RP_ORIGIN } from 'astro:env/server';
import { assess, describeDue, type Assessment } from '../maintenance';
import { ROLE_IDS } from '../roles';
import { getDb } from './db';
import * as table from './db/schema';
import { sendEmail, type EmailMessage } from './email';

/**
 * The maintenance digest: one email per person per day, only when something is
 * overdue or due soon, and only once per due cycle.
 *
 * The "once" is `reminderSentAt` on the schedule. It is stamped when a digest goes
 * out and cleared whenever the schedule is completed, so a schedule that stays
 * overdue is mentioned once, not every morning until someone gives in. Who gets mail
 * is decided in the query — a verified address, reminders left on, and not a demo,
 * whose placeholder address would only bounce — and whether a schedule is due is
 * decided by `assess`, the same rule the screens use.
 */

export interface DueItem {
	scheduleId: string;
	name: string;
	vehicleId: string;
	vehicleLabel: string;
	assessment: Assessment;
}

export interface Digest {
	userId: string;
	email: string;
	name: string;
	items: DueItem[];
}

const ORDER: Record<Assessment['state'], number> = { overdue: 0, 'due-soon': 1, ok: 2, unknown: 3 };

export async function collectDigests(now: Date = new Date()): Promise<Digest[]> {
	const rows = await getDb()
		.select({
			schedule: table.maintenanceSchedules,
			vehicle: {
				id: table.vehicles.id,
				year: table.vehicles.year,
				make: table.vehicles.make,
				model: table.vehicles.model,
				nickname: table.vehicles.nickname,
				currentMileage: table.vehicles.currentMileage
			},
			user: { id: table.user.id, email: table.user.email, name: table.user.name }
		})
		.from(table.maintenanceSchedules)
		.innerJoin(table.vehicles, eq(table.maintenanceSchedules.vehicleId, table.vehicles.id))
		.innerJoin(table.user, eq(table.vehicles.userId, table.user.id))
		.where(
			and(
				eq(table.user.emailVerified, true),
				eq(table.user.remindersByEmail, true),
				not(arrayContains(table.user.roles, [ROLE_IDS.DEMO])),
				or(
					isNull(table.maintenanceSchedules.reminderSentAt),
					lt(
						table.maintenanceSchedules.reminderSentAt,
						table.maintenanceSchedules.lastCompletedDate
					)
				)
			)
		);

	const byUser = new Map<string, Digest>();
	for (const { schedule, vehicle, user } of rows) {
		const assessment = assess(schedule, vehicle.currentMileage, now);
		if (assessment.state !== 'overdue' && assessment.state !== 'due-soon') continue;

		const digest = byUser.get(user.id) ?? {
			userId: user.id,
			email: user.email,
			name: user.name,
			items: []
		};
		digest.items.push({
			scheduleId: schedule.id,
			name: schedule.name,
			vehicleId: vehicle.id,
			vehicleLabel: vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
			assessment
		});
		byUser.set(user.id, digest);
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

const escapeHtml = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Where the links point. Production pins `RP_ORIGIN`; anywhere else is a rehearsal. */
const origin = () => RP_ORIGIN ?? 'https://frunk.cloud';

export function renderDigest(digest: Digest): EmailMessage {
	const base = origin();
	const overdue = digest.items.filter((item) => item.assessment.state === 'overdue').length;
	const count = digest.items.length;

	const subject =
		count === 1
			? `${digest.items[0]!.name} is ${overdue ? 'overdue' : 'due soon'} on your ${digest.items[0]!.vehicleLabel}`
			: `${count} maintenance items ${overdue ? 'need attention' : 'are due soon'}`;

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
				...items.map((item) => `  - ${item.name}: ${describeDue(item.assessment)}`),
				`  ${link}`
			].join('\n')
		);
		htmlBlocks.push(
			`<p style="margin:20px 0 6px"><a href="${link}" style="color:#6438cc;font-weight:600;text-decoration:none">${escapeHtml(vehicleLabel)}</a></p>` +
				`<ul style="margin:0;padding-left:20px">${items
					.map(
						(item) =>
							`<li style="margin:4px 0"><strong>${escapeHtml(item.name)}</strong> — ${escapeHtml(describeDue(item.assessment))}</li>`
					)
					.join('')}</ul>`
		);
	}

	const text = [
		`Hi ${digest.name},`,
		'',
		count === 1
			? 'One thing in your garage needs attention:'
			: 'Some things in your garage need attention:',
		'',
		...textBlocks,
		'',
		'Mark each one done from the vehicle page once it is taken care of.',
		`Turn these reminders off any time: ${base}/profile`
	].join('\n');

	const html = `
		<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#0b0f18;max-width:560px">
			<p style="margin:0 0 4px">Hi ${escapeHtml(digest.name)},</p>
			<p style="margin:0">${count === 1 ? 'One thing in your garage needs attention:' : 'Some things in your garage need attention:'}</p>
			${htmlBlocks.join('')}
			<p style="margin:24px 0 0;color:#5b6472">Mark each one done from the vehicle page once it is taken care of.</p>
			<p style="margin:8px 0 0;font-size:13px;color:#8b93a1">Turn these reminders off any time on <a href="${base}/profile" style="color:#8b93a1">your profile</a>.</p>
		</div>
	`.trim();

	return { to: digest.email, subject, html, text };
}

export interface DigestRun {
	sent: number;
	failed: number;
}

/** Sends every due digest and stamps the schedules it mentioned; a failed send stamps nothing. */
export async function sendMaintenanceDigests(now: Date = new Date()): Promise<DigestRun> {
	const digests = await collectDigests(now);
	let sent = 0;
	let failed = 0;

	for (const digest of digests) {
		try {
			await sendEmail(renderDigest(digest));
			await getDb()
				.update(table.maintenanceSchedules)
				.set({ reminderSentAt: now })
				.where(
					inArray(
						table.maintenanceSchedules.id,
						digest.items.map((item) => item.scheduleId)
					)
				);
			sent += 1;
		} catch (cause) {
			failed += 1;
			console.error(`Maintenance digest to user ${digest.userId} failed:`, cause);
		}
	}

	return { sent, failed };
}
