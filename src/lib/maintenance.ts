/**
 * When maintenance is due, computed the same way on both sides of the wire.
 *
 * A schedule is a name and an interval in miles, months or both, plus when it was
 * last done. Whether it is due follows from those and two facts about the vehicle
 * and the day: the odometer reading and today's date. This module is framework-free
 * and free of server imports so the garage badges, the detail screen, the digest
 * email and the tests all reach the same verdict from the same inputs.
 */

/** A schedule inside this window counts as "due soon" — enough notice to book it. */
export const DUE_SOON_DAYS = 30;
export const DUE_SOON_MILES = 500;

export type DueState = 'overdue' | 'due-soon' | 'ok' | 'unknown';

export interface ScheduleTerms {
	intervalMiles: number | null;
	intervalMonths: number | null;
	/** ISO on the client, `Date` on the server; both are accepted. */
	lastCompletedDate: string | Date | null;
	lastCompletedMileage: number | null;
}

export interface Assessment {
	state: DueState;
	dueDate: Date | null;
	dueMileage: number | null;
	/** Negative once overdue. `null` when there is no date to count from. */
	daysLeft: number | null;
	/** Negative once overdue. `null` without a mileage interval or an odometer reading. */
	milesLeft: number | null;
}

export interface Summary {
	overdue: number;
	dueSoon: number;
}

const DAY = 24 * 60 * 60 * 1000;

/** Calendar months, clamped to the last day of a shorter month (Jan 31 + 1 → Feb 28). */
export function addMonths(date: Date, months: number): Date {
	const next = new Date(date.getTime());
	const day = next.getDate();
	next.setDate(1);
	next.setMonth(next.getMonth() + months);
	const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
	next.setDate(Math.min(day, lastDay));
	return next;
}

function stateFor(daysLeft: number | null, milesLeft: number | null): DueState {
	if (daysLeft == null && milesLeft == null) return 'unknown';
	const overdue = (daysLeft != null && daysLeft < 0) || (milesLeft != null && milesLeft < 0);
	const soon =
		(daysLeft != null && daysLeft <= DUE_SOON_DAYS) ||
		(milesLeft != null && milesLeft <= DUE_SOON_MILES);
	return overdue ? 'overdue' : soon ? 'due-soon' : 'ok';
}

const daysUntil = (date: Date | null, now: Date) =>
	date ? Math.ceil((date.getTime() - now.getTime()) / DAY) : null;

/**
 * Whether a schedule is due. Whichever of the two intervals runs out first decides;
 * a schedule that has never been completed has nothing to count from and is
 * `unknown` until it is marked done once.
 */
export function assess(
	schedule: ScheduleTerms,
	currentMileage: number | null,
	now: Date = new Date()
): Assessment {
	const last = schedule.lastCompletedDate == null ? null : new Date(schedule.lastCompletedDate);

	const dueDate =
		last && schedule.intervalMonths != null ? addMonths(last, schedule.intervalMonths) : null;
	const dueMileage =
		schedule.lastCompletedMileage != null && schedule.intervalMiles != null
			? schedule.lastCompletedMileage + schedule.intervalMiles
			: null;

	const daysLeft = daysUntil(dueDate, now);
	const milesLeft =
		dueMileage != null && currentMileage != null ? dueMileage - currentMileage : null;

	return { state: stateFor(daysLeft, milesLeft), dueDate, dueMileage, daysLeft, milesLeft };
}

/**
 * A renewal — registration, inspection, emissions, insurance — is a schedule with no
 * interval and no "mark done": it has a date, and the date moves when it is renewed.
 * The same thresholds apply, so a renewal and a service sit in the same list.
 */
export function assessDeadline(
	date: string | Date | null | undefined,
	now: Date = new Date()
): Assessment {
	const dueDate = date == null ? null : new Date(date);
	const daysLeft = daysUntil(dueDate, now);
	return { state: stateFor(daysLeft, null), dueDate, dueMileage: null, daysLeft, milesLeft: null };
}

export type ExpirationKind = 'registration' | 'inspection' | 'emissions' | 'insurance';
export type ExpirationColumn = `${ExpirationKind}Expiration`;

export interface Expiration {
	kind: ExpirationKind;
	label: string;
	column: ExpirationColumn;
}

/** The dated renewals a vehicle carries; `column` names the vehicle field that holds each. */
export const EXPIRATIONS: readonly Expiration[] = [
	{ kind: 'registration', label: 'Registration', column: 'registrationExpiration' },
	{ kind: 'inspection', label: 'Inspection', column: 'inspectionExpiration' },
	{ kind: 'emissions', label: 'Emissions test', column: 'emissionsExpiration' },
	{ kind: 'insurance', label: 'Insurance', column: 'insuranceExpiration' }
];

export type Expirations = Partial<Record<ExpirationColumn, string | Date | null>>;

export interface AssessedExpiration {
	expiration: Expiration;
	expiresOn: Date;
	assessment: Assessment;
}

/** Every renewal a vehicle has a date for, assessed; the undated ones are simply absent. */
export function assessExpirations(
	vehicle: Expirations,
	now: Date = new Date()
): AssessedExpiration[] {
	return EXPIRATIONS.flatMap((expiration) => {
		const date = vehicle[expiration.column];
		if (date == null) return [];
		const assessment = assessDeadline(date, now);
		return [{ expiration, expiresOn: assessment.dueDate!, assessment }];
	});
}

export function summarize(assessments: readonly Assessment[]): Summary {
	return {
		overdue: assessments.filter((a) => a.state === 'overdue').length,
		dueSoon: assessments.filter((a) => a.state === 'due-soon').length
	};
}

const plural = (n: number, unit: string) => `${n.toLocaleString()} ${unit}${n === 1 ? '' : 's'}`;

/**
 * One line for a pill or an email: "Overdue by 12 days", "Due in 300 mi", "Due
 * today". When both intervals are counting, the one closer to running out speaks.
 */
export function describeDue(assessment: Assessment): string {
	const { state, daysLeft, milesLeft, dueMileage } = assessment;

	if (state === 'unknown') {
		return dueMileage != null
			? `Due at ${dueMileage.toLocaleString()} mi — add the odometer reading to track it`
			: 'Not started — mark it done once to start the clock';
	}

	if (state === 'overdue') {
		const by: string[] = [];
		if (daysLeft != null && daysLeft < 0) by.push(plural(-daysLeft, 'day'));
		if (milesLeft != null && milesLeft < 0) by.push(`${(-milesLeft).toLocaleString()} mi`);
		return `Overdue by ${by.join(' and ')}`;
	}

	const soonest: string[] = [];
	if (daysLeft != null) soonest.push(daysLeft === 0 ? 'today' : `in ${plural(daysLeft, 'day')}`);
	if (milesLeft != null) soonest.push(`in ${milesLeft.toLocaleString()} mi`);

	const [first, second] = soonest;
	if (first && second) {
		// Both are counting; lead with whichever is nearer to its limit.
		const daysShare = daysLeft == null ? 1 : daysLeft / DUE_SOON_DAYS;
		const milesShare = milesLeft == null ? 1 : milesLeft / DUE_SOON_MILES;
		return `Due ${daysShare <= milesShare ? first : second}`;
	}
	return `Due ${first ?? second ?? ''}`.trim();
}

/** The renewal counterpart of `describeDue`: "Expired 3 days ago", "Expires in 12 days". */
export function describeDeadline(assessment: Assessment): string {
	const { daysLeft } = assessment;
	if (daysLeft == null) return 'No date';
	if (daysLeft < 0) return `Expired ${plural(-daysLeft, 'day')} ago`;
	if (daysLeft === 0) return 'Expires today';
	return `Expires in ${plural(daysLeft, 'day')}`;
}

export interface Template {
	name: string;
	intervalMiles: number | null;
	intervalMonths: number | null;
}

/**
 * The common services, at the intervals most owner's manuals land on. They are
 * starting points the form prefills, not rules — every field stays editable.
 */
export const TEMPLATES: readonly Template[] = [
	{ name: 'Oil change', intervalMiles: 5000, intervalMonths: 6 },
	{ name: 'Tire rotation', intervalMiles: 6000, intervalMonths: 6 },
	{ name: 'Brake inspection', intervalMiles: 12000, intervalMonths: 12 },
	{ name: 'Engine air filter', intervalMiles: 15000, intervalMonths: 12 },
	{ name: 'Cabin air filter', intervalMiles: 15000, intervalMonths: 12 },
	{ name: 'Wiper blades', intervalMiles: null, intervalMonths: 12 },
	{ name: 'State inspection', intervalMiles: null, intervalMonths: 12 },
	{ name: 'Brake fluid', intervalMiles: null, intervalMonths: 24 },
	{ name: 'Coolant', intervalMiles: 30000, intervalMonths: 36 },
	{ name: 'Battery', intervalMiles: null, intervalMonths: 36 },
	{ name: 'Transmission fluid', intervalMiles: 60000, intervalMonths: null },
	{ name: 'Spark plugs', intervalMiles: 60000, intervalMonths: null }
];
