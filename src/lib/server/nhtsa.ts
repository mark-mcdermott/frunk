import { NHTSA_BASE } from 'astro:env/server';

/**
 * The US National Highway Traffic Safety Administration's public data: VIN decoding
 * (vPIC) and safety recalls. Free, keyless, and two different hosts.
 *
 * Both answers are the same for every user and change rarely, so each is kept for a day
 * in this instance's memory. A recall list is per model and year, not per vehicle, and a
 * garage full of one model asks once. `NHTSA_BASE` points both at one stand-in; the
 * suite (`tests/nhtsa.test.ts`) serves both paths from it.
 *
 * Everything returned is normalized into the words the vehicle form uses. NHTSA writes
 * "JEEP", "4WD/4-Wheel Drive/4x4" and "Sport Utility Vehicle (SUV)/Multipurpose Vehicle
 * (MPV)"; the form wants "Jeep", "4WD" and "SUV".
 */
const VPIC = NHTSA_BASE ?? 'https://vpic.nhtsa.dot.gov';
const RECALLS = NHTSA_BASE ?? 'https://api.nhtsa.gov';
const TIMEOUT_MS = 8_000;
const TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_LIMIT = 500;

/** 17 characters; I, O and Q never appear, so they cannot be mistaken for 1 and 0. */
export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export class NhtsaUnavailable extends Error {}

const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;

	const value = await load();
	if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
	cache.set(key, { at: Date.now(), value });
	return value;
}

async function getJson(url: string): Promise<unknown> {
	let response: Response;
	try {
		response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
	} catch (cause) {
		throw new NhtsaUnavailable(`NHTSA did not answer: ${String(cause)}`);
	}
	if (!response.ok) throw new NhtsaUnavailable(`NHTSA answered ${response.status}`);
	return response.json();
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** "JEEP" → "Jeep", "MERCEDES-BENZ" → "Mercedes-Benz"; short all-caps marks stay ("BMW"). */
function brandCase(value: string) {
	if (value.length <= 3) return value;
	return value
		.toLowerCase()
		.replace(/(^|[\s-])([a-z])/g, (_, gap, letter) => gap + letter.toUpperCase());
}

/** NHTSA's recall text is all capitals; this makes it readable without guessing at nouns. */
function sentenceCase(value: string) {
	return value
		.toLowerCase()
		.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, gap, letter) => gap + letter.toUpperCase());
}

const BODY_STYLES: [RegExp, string][] = [
	[/sport utility/i, 'SUV'],
	[/pickup/i, 'Truck'],
	[/minivan/i, 'Minivan'],
	[/\bvan\b/i, 'Van'],
	[/convertible|cabriolet|roadster/i, 'Convertible'],
	[/coupe/i, 'Coupe'],
	[/hatchback/i, 'Hatchback'],
	[/wagon/i, 'Wagon'],
	[/sedan|saloon/i, 'Sedan']
];

const bodyStyleOf = (bodyClass: string) =>
	BODY_STYLES.find(([pattern]) => pattern.test(bodyClass))?.[1] ?? null;

/** "4WD/4-Wheel Drive/4x4" → "4WD"; NHTSA leads every drive type with its short form. */
function drivetrainOf(driveType: string) {
	const short = driveType.split('/')[0]?.trim() ?? '';
	return short === '4x2' ? '2WD' : short || null;
}

const LAYOUTS: [RegExp, string][] = [
	[/in-line|straight/i, 'I'],
	[/v-shaped/i, 'V'],
	[/horizontally opposed|flat|boxer/i, 'H'],
	[/w-shaped/i, 'W']
];

/** Cylinder layout and count, as the form's own example writes it: "I6", "V8". */
function engineTypeOf(configuration: string, cylinders: string, fuel: string) {
	if (/electric/i.test(fuel) && !cylinders) return 'Electric';
	if (/rotary|wankel/i.test(configuration)) return 'Rotary';
	if (!cylinders) return null;
	const layout = LAYOUTS.find(([pattern]) => pattern.test(configuration))?.[1];
	return layout ? `${layout}${cylinders}` : `${cylinders}-cylinder`;
}

function engineSizeOf(litres: string) {
	const size = Number(litres);
	return litres && Number.isFinite(size) && size > 0 ? `${size.toFixed(1)} L` : null;
}

function transmissionOf(style: string, speeds: string) {
	const kind = /manual/i.test(style) ? 'manual' : style.toLowerCase();
	if (!kind) return null;
	return speeds ? `${speeds}-speed ${kind}` : kind.charAt(0).toUpperCase() + kind.slice(1);
}

export interface DecodedVin {
	year: number | null;
	make: string | null;
	model: string | null;
	trim: string | null;
	bodyStyle: string | null;
	engineSize: string | null;
	engineType: string | null;
	fuelType: string | null;
	drivetrain: string | null;
	transmission: string | null;
	/** The ninth character did not check out: a typo is likelier than a rare car. */
	checkDigitFailed: boolean;
}

/** Null when NHTSA could not tell even the make: nothing worth filling in. */
export function decodeVin(vin: string): Promise<DecodedVin | null> {
	return cached(`vin:${vin}`, async () => {
		const body = await getJson(
			`${VPIC}/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`
		);
		const row = (body as { Results?: Record<string, unknown>[] }).Results?.[0] ?? {};
		const field = (name: string) => text(row[name]);

		if (!field('Make')) return null;

		const fuel = field('FuelTypePrimary');
		const year = Number(field('ModelYear'));
		return {
			year: Number.isInteger(year) && year > 0 ? year : null,
			make: brandCase(field('Make')),
			model: field('Model') || null,
			trim: field('Trim') || field('Series') || null,
			bodyStyle: bodyStyleOf(field('BodyClass')),
			engineSize: engineSizeOf(field('DisplacementL')),
			engineType: engineTypeOf(field('EngineConfiguration'), field('EngineCylinders'), fuel),
			fuelType: fuel || null,
			drivetrain: drivetrainOf(field('DriveType')),
			transmission: transmissionOf(field('TransmissionStyle'), field('TransmissionSpeeds')),
			checkDigitFailed: field('ErrorCode')
				.split(',')
				.map((code) => code.trim())
				.includes('1')
		};
	});
}

export interface Recall {
	campaign: string;
	component: string;
	summary: string;
	consequence: string;
	remedy: string;
	/** ISO date (YYYY-MM-DD) NHTSA received the manufacturer's report, when given. */
	reportedOn: string | null;
}

/** NHTSA writes dates day first: "23/03/2006". */
function isoDate(value: string) {
	const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
	return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

/** Every recall on file for the model year, newest first. */
export function recallsFor(make: string, model: string, year: number): Promise<Recall[]> {
	const query = new URLSearchParams({ make, model, modelYear: String(year) });
	return cached(`recalls:${query.toString().toLowerCase()}`, async () => {
		const body = await getJson(`${RECALLS}/recalls/recallsByVehicle?${query.toString()}`);
		const rows = (body as { results?: Record<string, unknown>[] }).results ?? [];

		return rows
			.map((row) => ({
				campaign: text(row.NHTSACampaignNumber),
				component: sentenceCase(text(row.Component)),
				summary: sentenceCase(text(row.Summary)),
				consequence: sentenceCase(text(row.Consequence)),
				remedy: sentenceCase(text(row.Remedy)),
				reportedOn: isoDate(text(row.ReportReceivedDate))
			}))
			.filter((recall) => recall.campaign)
			.sort((a, b) => (b.reportedOn ?? '').localeCompare(a.reportedOn ?? ''));
	});
}
