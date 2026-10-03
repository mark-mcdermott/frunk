import { Check, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { assessExpirations } from '@/lib/maintenance';
import type { Vehicle } from '../api';

/**
 * "Finish setting up", in place of a page that is mostly empty panels.
 *
 * Found dogfooding (2026-10-02): a new vehicle's screen was five boxes announcing that
 * nothing was there yet, which read as sparse rather than calm. This card turns those
 * gaps into a short, finishable list. Each step opens the edit form already scrolled to
 * its field (`#vin`, `#currentMileage`, …) or jumps to the panel it fills. The card goes
 * away once every step is done, or when it is hidden, which is remembered per vehicle on
 * this device only. That is a convenience, not data, so a failing `localStorage` (a
 * private window) simply shows the card again.
 */

interface Step {
	key: string;
	label: string;
	hint: string;
	done: boolean;
	to?: string;
	onGo?: () => void;
}

const hiddenKey = (vehicleId: string) => `frunk:setup-hidden:${vehicleId}`;

function readHidden(vehicleId: string) {
	try {
		return localStorage.getItem(hiddenKey(vehicleId)) === '1';
	} catch {
		return false;
	}
}

function writeHidden(vehicleId: string) {
	try {
		localStorage.setItem(hiddenKey(vehicleId), '1');
	} catch {
		// Hidden for this visit only; the card returns next time, which is harmless.
	}
}

function Progress({ done, total }: { done: number; total: number }) {
	const radius = 15;
	const circumference = 2 * Math.PI * radius;

	return (
		<svg viewBox="0 0 36 36" className="size-10 shrink-0 -rotate-90" aria-hidden>
			<circle cx="18" cy="18" r={radius} fill="none" strokeWidth="3" className="stroke-border" />
			<circle
				cx="18"
				cy="18"
				r={radius}
				fill="none"
				strokeWidth="3"
				strokeLinecap="round"
				strokeDasharray={circumference}
				strokeDashoffset={circumference * (1 - done / total)}
				className="stroke-accent-bright transition-[stroke-dashoffset] duration-500"
			/>
		</svg>
	);
}

const ROW = 'flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left';

function StepRow({ step }: { step: Step }) {
	const body = (
		<>
			<span
				aria-hidden
				className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
					step.done ? 'border-positive bg-positive-bg text-positive' : 'border-border-strong'
				}`}
			>
				{step.done && <Check className="size-3.5" strokeWidth={2.25} />}
			</span>
			<span className="min-w-0 flex-1">
				<span
					className={`block text-[0.9375rem] ${step.done ? 'text-text-faint line-through' : 'text-text'}`}
				>
					{step.label}
					{step.done && <span className="sr-only"> (done)</span>}
				</span>
				{!step.done && <span className="block text-[0.8125rem] text-text-muted">{step.hint}</span>}
			</span>
			{!step.done && (
				<ChevronRight className="size-4 shrink-0 text-text-faint" strokeWidth={1.75} aria-hidden />
			)}
		</>
	);

	if (step.done) return <div className={ROW}>{body}</div>;

	const interactive = `${ROW} transition-colors hover:bg-surface-raised`;
	return step.to ? (
		<Link to={step.to} className={interactive}>
			{body}
		</Link>
	) : (
		<button type="button" onClick={step.onGo} className={interactive}>
			{body}
		</button>
	);
}

export function VehicleSetup({
	vehicle,
	hasSchedules,
	hasRepairs,
	maintenanceId
}: {
	vehicle: Vehicle;
	hasSchedules: boolean;
	hasRepairs: boolean;
	maintenanceId: string;
}) {
	const [hidden, setHidden] = useState(() => readHidden(vehicle.id));
	const edit = (field: string) => `/vehicles/${vehicle.id}/edit#${field}`;

	const steps: Step[] = [
		{
			key: 'photo',
			label: 'Add a photo',
			hint: 'It goes on this page and on your garage card.',
			done: Boolean(vehicle.image),
			to: edit('image')
		},
		{
			key: 'vin',
			label: 'Add the VIN',
			hint: 'It’s on your registration and insurance card.',
			done: Boolean(vehicle.vin),
			to: edit('vin')
		},
		{
			key: 'mileage',
			label: 'Record the mileage',
			hint: 'So maintenance knows what’s due.',
			done: vehicle.currentMileage != null,
			to: edit('currentMileage')
		},
		{
			key: 'renewals',
			label: 'Add a renewal date',
			hint: 'Registration, inspection or insurance, and we’ll remind you.',
			done: assessExpirations(vehicle).length > 0,
			to: edit('registrationExpiration')
		},
		{
			key: 'maintenance',
			label: 'Set up maintenance',
			hint: 'Start from a common service like an oil change.',
			done: hasSchedules,
			onGo: () => document.getElementById(maintenanceId)?.scrollIntoView({ behavior: 'smooth' })
		},
		{
			key: 'repair',
			label: 'Log your last service',
			hint: 'Every service you record builds this car’s history.',
			done: hasRepairs,
			to: `/repairs/new?vehicle=${vehicle.id}`
		}
	];

	const done = steps.filter((step) => step.done).length;
	if (hidden || done === steps.length) return null;

	return (
		<section aria-labelledby="setup-heading" className="card p-6">
			<div className="flex items-center gap-4">
				<Progress done={done} total={steps.length} />
				<div className="min-w-0 flex-1">
					<h2 id="setup-heading" className="heading text-lg">
						Finish setting up
					</h2>
					<p className="text-[0.8125rem] text-text-muted">
						{done} of {steps.length} done
					</p>
				</div>
				<button
					type="button"
					aria-label="Hide setup checklist"
					onClick={() => {
						writeHidden(vehicle.id);
						setHidden(true);
					}}
					className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-faint transition-colors hover:bg-surface-raised hover:text-text"
				>
					<X className="size-4" strokeWidth={1.75} aria-hidden />
				</button>
			</div>

			<ul className="-mx-3 mt-4 flex flex-col gap-0.5">
				{steps.map((step) => (
					<li key={step.key}>
						<StepRow step={step} />
					</li>
				))}
			</ul>
		</section>
	);
}
