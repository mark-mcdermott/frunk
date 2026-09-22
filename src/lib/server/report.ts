import PDFDocument from 'pdfkit';
import { desc, eq } from 'drizzle-orm';
import { assess, assessExpirations, describeDue } from '../maintenance';
import { getDb } from './db';
import * as table from './db/schema';
import { attachmentCount } from './repairs';

/**
 * The maintenance history a seller hands a buyer: the vehicle, its renewals, its
 * schedules and every service on record, as a PDF and as a CSV.
 *
 * Built with pdfkit and its built-in Helvetica rather than the site's fonts: the
 * document has to open on any machine and print on any printer, and a PDF that ships
 * two web fonts to say "oil change" is heavier than it is handsome. Private details
 * — the policy number, the insurer, notes — stay out on purpose; this is the record
 * of the car, not of its owner.
 */

export interface History {
	vehicle: table.Vehicle;
	repairs: (Pick<table.Repair, 'id' | 'description' | 'date' | 'mileage' | 'cost' | 'status'> & {
		vendorName: string | null;
		attachmentCount: number;
	})[];
	schedules: table.MaintenanceSchedule[];
}

export async function loadHistory(vehicle: table.Vehicle): Promise<History> {
	const db = getDb();
	const [repairs, schedules] = await Promise.all([
		db
			.select({
				id: table.repairs.id,
				description: table.repairs.description,
				date: table.repairs.date,
				mileage: table.repairs.mileage,
				cost: table.repairs.cost,
				status: table.repairs.status,
				vendorName: table.vendors.name,
				attachmentCount: attachmentCount(table.repairs.id)
			})
			.from(table.repairs)
			.leftJoin(table.vendors, eq(table.repairs.vendorId, table.vendors.id))
			.where(eq(table.repairs.vehicleId, vehicle.id))
			.orderBy(desc(table.repairs.date)),
		db
			.select()
			.from(table.maintenanceSchedules)
			.where(eq(table.maintenanceSchedules.vehicleId, vehicle.id))
			.orderBy(table.maintenanceSchedules.name)
	]);
	return { vehicle, repairs, schedules };
}

export const vehicleTitle = (vehicle: table.Vehicle) =>
	`${vehicle.year} ${vehicle.make} ${vehicle.model}`;

/** `1974-AMC-Gremlin-history` — safe in a Content-Disposition header. */
export const reportSlug = (vehicle: table.Vehicle) =>
	`${vehicleTitle(vehicle)}-history`.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-');

const money = (cents: number) =>
	(cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const miles = (n: number) => `${n.toLocaleString('en-US')} mi`;
const day = (date: Date) =>
	date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const STATUS: Record<string, string> = {
	completed: 'Completed',
	scheduled: 'Scheduled',
	in_progress: 'In progress'
};

// Letter, 54pt margins: the content column is 504pt wide.
const MARGIN = 54;
const WIDTH = 612 - MARGIN * 2;
const INK = '#0b0f18';
const MUTED = '#5b6472';
const RULE = '#d9dbe0';

type Doc = InstanceType<typeof PDFDocument>;

function heading(doc: Doc, text: string) {
	ensureRoom(doc, 40);
	doc.moveDown(1.2).font('Helvetica-Bold').fontSize(13).fillColor(INK).text(text);
	doc
		.moveTo(MARGIN, doc.y + 4)
		.lineTo(MARGIN + WIDTH, doc.y + 4)
		.lineWidth(0.5)
		.strokeColor(RULE)
		.stroke();
	doc.moveDown(0.8);
}

function ensureRoom(doc: Doc, height: number) {
	if (doc.y + height > doc.page.height - MARGIN) doc.addPage();
}

/** Label / value pairs in two columns, the way a spec sheet reads. */
function facts(doc: Doc, pairs: [string, string | null | undefined][]) {
	const shown = pairs.filter((pair): pair is [string, string] => Boolean(pair[1]));
	const column = WIDTH / 2;
	for (let i = 0; i < shown.length; i += 2) {
		ensureRoom(doc, 30);
		const y = doc.y;
		for (const [j, [label, value]] of shown.slice(i, i + 2).entries()) {
			const x = MARGIN + j * column;
			doc
				.font('Helvetica')
				.fontSize(8)
				.fillColor(MUTED)
				.text(label.toUpperCase(), x, y, {
					width: column - 12,
					characterSpacing: 0.6
				});
			doc
				.font('Helvetica')
				.fontSize(11)
				.fillColor(INK)
				.text(value, x, y + 11, { width: column - 12 });
		}
		doc.x = MARGIN;
		doc.y = y + 30;
	}
}

interface Column {
	title: string;
	width: number;
	align?: 'left' | 'right';
}

function tableHeader(doc: Doc, columns: Column[]) {
	const y = doc.y;
	let x = MARGIN;
	doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED);
	for (const column of columns) {
		doc.text(column.title.toUpperCase(), x, y, {
			width: column.width,
			align: column.align ?? 'left',
			characterSpacing: 0.6
		});
		x += column.width;
	}
	doc
		.moveTo(MARGIN, y + 13)
		.lineTo(MARGIN + WIDTH, y + 13)
		.lineWidth(0.5)
		.strokeColor(RULE)
		.stroke();
	doc.x = MARGIN;
	doc.y = y + 18;
}

function tableRow(doc: Doc, columns: Column[], cells: string[]) {
	doc.font('Helvetica').fontSize(9.5).fillColor(INK);
	const heights = cells.map((cell, i) =>
		doc.heightOfString(cell, { width: columns[i]!.width - 8 })
	);
	const height = Math.max(...heights, 12) + 7;
	if (doc.y + height > doc.page.height - MARGIN) {
		doc.addPage();
		tableHeader(doc, columns);
	}
	const y = doc.y;
	let x = MARGIN;
	for (const [i, column] of columns.entries()) {
		doc.text(cells[i] ?? '', x, y, { width: column.width - 8, align: column.align ?? 'left' });
		x += column.width;
	}
	doc
		.moveTo(MARGIN, y + height - 3)
		.lineTo(MARGIN + WIDTH, y + height - 3)
		.lineWidth(0.25)
		.strokeColor(RULE)
		.stroke();
	doc.x = MARGIN;
	doc.y = y + height;
}

export function renderReport(history: History, now: Date = new Date()): Promise<Buffer> {
	const { vehicle, repairs, schedules } = history;
	const title = vehicleTitle(vehicle);

	const doc = new PDFDocument({
		size: 'LETTER',
		margin: MARGIN,
		bufferPages: true,
		info: { Title: `${title} — maintenance history`, Author: 'Frunk', Creator: 'frunk.cloud' }
	});
	const chunks: Buffer[] = [];
	doc.on('data', (chunk: Buffer) => chunks.push(chunk));
	const done = new Promise<Buffer>((resolve, reject) => {
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);
	});

	// Title
	doc
		.font('Helvetica')
		.fontSize(9)
		.fillColor(MUTED)
		.text('MAINTENANCE HISTORY', { characterSpacing: 1 });
	doc.moveDown(0.3).font('Helvetica-Bold').fontSize(24).fillColor(INK).text(title);
	if (vehicle.nickname) {
		doc.font('Helvetica').fontSize(11).fillColor(MUTED).text(`“${vehicle.nickname}”`);
	}
	doc
		.moveDown(0.4)
		.font('Helvetica')
		.fontSize(9)
		.fillColor(MUTED)
		.text(`Prepared ${day(now)} with frunk.cloud`);

	// Vehicle
	heading(doc, 'Vehicle');
	facts(doc, [
		['VIN', vehicle.vin],
		['Odometer', vehicle.currentMileage == null ? null : miles(vehicle.currentMileage)],
		[
			'Plate',
			[vehicle.licensePlate, vehicle.licensePlateState].filter(Boolean).join(' · ') || null
		],
		['Body style', vehicle.bodyStyle],
		['Color', vehicle.color],
		['Engine', [vehicle.engineSize, vehicle.engineType].filter(Boolean).join(' ') || null],
		['Transmission', vehicle.transmission],
		['Drivetrain', vehicle.drivetrain],
		['Fuel', vehicle.fuelType],
		['Purchased', vehicle.purchaseDate ? day(vehicle.purchaseDate) : null]
	]);

	// Renewals — the public ones; insurance is between the owner and the insurer.
	const renewals = assessExpirations(vehicle, now).filter((r) => r.expiration.kind !== 'insurance');
	if (renewals.length) {
		heading(doc, 'Renewals');
		facts(
			doc,
			renewals.map((r) => [r.expiration.label, `${day(r.expiresOn)}`] as [string, string])
		);
	}

	// Schedules
	heading(doc, 'Maintenance schedule');
	if (schedules.length === 0) {
		doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('No schedules recorded.');
	} else {
		const columns: Column[] = [
			{ title: 'Service', width: 150 },
			{ title: 'Interval', width: 120 },
			{ title: 'Last done', width: 130 },
			{ title: 'Next', width: 104 }
		];
		tableHeader(doc, columns);
		for (const schedule of schedules) {
			const interval = [
				schedule.intervalMiles != null && miles(schedule.intervalMiles),
				schedule.intervalMonths != null && `${schedule.intervalMonths} mo`
			]
				.filter(Boolean)
				.join(' / ');
			const last = [
				schedule.lastCompletedDate && day(schedule.lastCompletedDate),
				schedule.lastCompletedMileage != null && miles(schedule.lastCompletedMileage)
			]
				.filter(Boolean)
				.join(' at ');
			const next = assess(schedule, vehicle.currentMileage, now);
			tableRow(doc, columns, [
				schedule.name,
				interval,
				last || '—',
				next.state === 'unknown' ? '—' : describeDue(next)
			]);
		}
	}

	// Repairs, oldest first: a history reads forwards.
	heading(doc, 'Service record');
	const chronological = [...repairs].sort((a, b) => a.date.getTime() - b.date.getTime());
	if (chronological.length === 0) {
		doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('No services recorded.');
	} else {
		const columns: Column[] = [
			{ title: 'Date', width: 78 },
			{ title: 'Service', width: 176 },
			{ title: 'Mileage', width: 70, align: 'right' },
			{ title: 'Vendor', width: 110 },
			{ title: 'Cost', width: 70, align: 'right' }
		];
		tableHeader(doc, columns);
		for (const repair of chronological) {
			const receipts =
				repair.attachmentCount > 0
					? ` (${repair.attachmentCount} receipt${repair.attachmentCount === 1 ? '' : 's'} on file)`
					: '';
			const status =
				repair.status === 'completed' ? '' : ` — ${STATUS[repair.status] ?? repair.status}`;
			tableRow(doc, columns, [
				day(repair.date),
				`${repair.description}${status}${receipts}`,
				repair.mileage == null ? '' : miles(repair.mileage),
				repair.vendorName ?? '',
				repair.cost == null ? '' : money(repair.cost)
			]);
		}
		const completed = chronological.filter((r) => r.status === 'completed');
		const total = completed.reduce((sum, r) => sum + (r.cost ?? 0), 0);
		ensureRoom(doc, 30);
		doc.moveDown(0.6);
		doc
			.font('Helvetica-Bold')
			.fontSize(10)
			.fillColor(INK)
			.text(
				`${completed.length} completed service${completed.length === 1 ? '' : 's'} · ${money(total)} recorded`,
				MARGIN,
				doc.y,
				{ width: WIDTH, align: 'right' }
			);
	}

	// Footer on every page
	const pages = doc.bufferedPageRange();
	for (let i = 0; i < pages.count; i += 1) {
		doc.switchToPage(i);
		doc
			.font('Helvetica')
			.fontSize(8)
			.fillColor(MUTED)
			.text(
				`${title} · frunk.cloud · page ${i + 1} of ${pages.count}`,
				MARGIN,
				doc.page.height - 40,
				{
					width: WIDTH,
					align: 'center',
					lineBreak: false
				}
			);
	}

	doc.end();
	return done;
}

const csvCell = (value: string | number | null | undefined) => {
	const text = value == null ? '' : String(value);
	return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** The service record as rows a spreadsheet opens cleanly: dollars, not cents; ISO dates. */
export function renderCsv(history: History): string {
	const header = ['Date', 'Service', 'Status', 'Mileage', 'Cost', 'Vendor', 'Receipts'];
	const rows = [...history.repairs]
		.sort((a, b) => a.date.getTime() - b.date.getTime())
		.map((repair) => [
			repair.date.toISOString().slice(0, 10),
			repair.description,
			STATUS[repair.status] ?? repair.status,
			repair.mileage ?? '',
			repair.cost == null ? '' : (repair.cost / 100).toFixed(2),
			repair.vendorName ?? '',
			repair.attachmentCount
		]);
	return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
