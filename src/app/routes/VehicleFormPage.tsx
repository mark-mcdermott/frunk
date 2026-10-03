import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Trash2 } from 'lucide-react';
import { useEffect, useState, type SubmitEvent } from 'react';
import { useLocation, useParams } from 'react-router';
import {
	createVehicle,
	decodeVin,
	deleteVehicle,
	getVehicle,
	keys,
	updateVehicle,
	type DecodedVin,
	type Vehicle,
	type VehicleInput
} from '../api';
import { useCrumbs } from '../AppShell';
import { useLeave } from '../history';
import { plainOptions, SelectField, TextField } from '../components/Field';
import { FileField } from '../components/FileField';
import { fromDateInput, toDateInput } from '../format';

/**
 * Add and edit a vehicle, built to `docs/mocks/vehicle-edit.webp`.
 *
 * One component for both: the fields, validation and submit path are identical, and
 * the only differences are the title, whether the form starts populated, and whether
 * Delete exists. Splitting them would duplicate the field list, which is the part most
 * likely to drift.
 *
 * **Three deliberate departures from the mock**, all because the mock's control implies
 * data the model does not carry:
 *
 * - **Make is a text input, not a select.** A dropdown needs a curated manufacturer
 *   list; `vehicles.make` is free text, and a select that cannot hold "AMC" unless
 *   someone enumerates every marque is worse than typing it.
 * - **Engine is two fields.** The mock shows one ("258ci I6") but the schema has
 *   `engineSize` and `engineType`. The detail screen joins them back for display.
 * - Cover Image uploads to the private Blob store (`FileField`) — the form stores the
 *   `/api/files/…` serving URL, and the PATCH endpoint deletes the old blob when the
 *   image is replaced or cleared.
 *
 * Nickname and Current Mileage are added, though the mock omits them: the garage list
 * renders both, and without them here there is no way to set either.
 */

const BODY_STYLES = plainOptions([
	'Sedan',
	'Coupe',
	'Hatchback',
	'Wagon',
	'Convertible',
	'SUV',
	'Truck',
	'Van',
	'Minivan'
]);

interface FormState {
	year: string;
	make: string;
	model: string;
	trim: string;
	nickname: string;
	vin: string;
	bodyStyle: string | null;
	color: string;
	engineSize: string;
	engineType: string;
	transmission: string;
	drivetrain: string;
	fuelType: string;
	currentMileage: string;
	image: string | null;
	licensePlate: string;
	licensePlateState: string;
	/** `YYYY-MM-DD` for the date inputs; empty when unknown. */
	registrationExpiration: string;
	inspectionExpiration: string;
	emissionsExpiration: string;
	insuranceProvider: string;
	insurancePolicyNumber: string;
	insuranceExpiration: string;
}

const BLANK: FormState = {
	year: '',
	make: '',
	model: '',
	trim: '',
	nickname: '',
	vin: '',
	bodyStyle: null,
	color: '',
	engineSize: '',
	engineType: '',
	transmission: '',
	drivetrain: '',
	fuelType: '',
	currentMileage: '',
	image: null,
	licensePlate: '',
	licensePlateState: '',
	registrationExpiration: '',
	inspectionExpiration: '',
	emissionsExpiration: '',
	insuranceProvider: '',
	insurancePolicyNumber: '',
	insuranceExpiration: ''
};

const dateOrBlank = (iso: string | null) => (iso ? toDateInput(iso) : '');

function toForm(vehicle: Vehicle): FormState {
	return {
		year: String(vehicle.year),
		make: vehicle.make,
		model: vehicle.model,
		trim: vehicle.trim ?? '',
		nickname: vehicle.nickname ?? '',
		vin: vehicle.vin ?? '',
		bodyStyle: vehicle.bodyStyle,
		color: vehicle.color ?? '',
		engineSize: vehicle.engineSize ?? '',
		engineType: vehicle.engineType ?? '',
		transmission: vehicle.transmission ?? '',
		drivetrain: vehicle.drivetrain ?? '',
		fuelType: vehicle.fuelType ?? '',
		currentMileage: vehicle.currentMileage == null ? '' : String(vehicle.currentMileage),
		image: vehicle.image,
		licensePlate: vehicle.licensePlate ?? '',
		licensePlateState: vehicle.licensePlateState ?? '',
		registrationExpiration: dateOrBlank(vehicle.registrationExpiration),
		inspectionExpiration: dateOrBlank(vehicle.inspectionExpiration),
		emissionsExpiration: dateOrBlank(vehicle.emissionsExpiration),
		insuranceProvider: vehicle.insuranceProvider ?? '',
		insurancePolicyNumber: vehicle.insurancePolicyNumber ?? '',
		insuranceExpiration: dateOrBlank(vehicle.insuranceExpiration)
	};
}

/** An emptied optional field sends `null`, which is what clears the column; `''` would not. */
const orNull = (value: string) => (value.trim() ? value.trim() : null);
/* A date-only column: local midnight of the chosen day, or null to clear it. */
const dateOrNull = (value: string) => (value ? fromDateInput(value) : null);

function toPayload(form: FormState): VehicleInput {
	return {
		year: Number(form.year),
		make: form.make.trim(),
		model: form.model.trim(),
		trim: orNull(form.trim),
		nickname: orNull(form.nickname),
		vin: orNull(form.vin),
		bodyStyle: form.bodyStyle,
		color: orNull(form.color),
		engineSize: orNull(form.engineSize),
		engineType: orNull(form.engineType),
		transmission: orNull(form.transmission),
		drivetrain: orNull(form.drivetrain),
		fuelType: orNull(form.fuelType),
		currentMileage: form.currentMileage.trim() ? Number(form.currentMileage) : null,
		image: form.image,
		licensePlate: orNull(form.licensePlate),
		licensePlateState: orNull(form.licensePlateState),
		registrationExpiration: dateOrNull(form.registrationExpiration),
		inspectionExpiration: dateOrNull(form.inspectionExpiration),
		emissionsExpiration: dateOrNull(form.emissionsExpiration),
		insuranceProvider: orNull(form.insuranceProvider),
		insurancePolicyNumber: orNull(form.insurancePolicyNumber),
		insuranceExpiration: dateOrNull(form.insuranceExpiration)
	};
}

const FROM_VIN = [
	'make',
	'model',
	'trim',
	'bodyStyle',
	'engineSize',
	'engineType',
	'transmission',
	'drivetrain',
	'fuelType'
] as const;

/**
 * Fills what the VIN told us into the fields still empty. Anything already typed is the
 * owner's word and stays: NHTSA's trim or engine can be wrong for a car that was swapped
 * or rebadged, and a lookup should never quietly overwrite it.
 */
function fillFromVin(form: FormState, decoded: DecodedVin): { next: FormState; filled: number } {
	const next = { ...form };
	let filled = 0;

	if (decoded.year && !next.year.trim()) {
		next.year = String(decoded.year);
		filled++;
	}
	for (const key of FROM_VIN) {
		const value = decoded[key];
		if (value && !next[key]?.trim()) {
			next[key] = value;
			filled++;
		}
	}
	return { next, filled };
}

function describeFill(filled: number, checkDigitFailed: boolean) {
	const done =
		filled === 0
			? 'Nothing new to fill in: those fields already have values.'
			: `Filled in ${filled} ${filled === 1 ? 'field' : 'fields'} from the VIN. Check them over.`;
	return checkDigitFailed ? `${done} Its check digit doesn’t add up, so look for a typo.` : done;
}

type Errors = Partial<Record<'year' | 'make' | 'model' | 'currentMileage', string>>;

/**
 * Mirrors `createVehicleSchema` closely enough to catch the common mistakes before a
 * round trip. The server stays the authority — its error surfaces in the banner.
 */
function validate(form: FormState): Errors {
	const errors: Errors = {};
	const year = Number(form.year);
	const max = new Date().getFullYear() + 2;

	if (!form.year.trim()) errors.year = 'Year is required';
	else if (!Number.isInteger(year) || year < 1900 || year > max)
		errors.year = 'Please enter a valid year';

	if (!form.make.trim()) errors.make = 'Make is required';
	if (!form.model.trim()) errors.model = 'Model is required';

	if (form.currentMileage.trim() && !Number.isInteger(Number(form.currentMileage)))
		errors.currentMileage = 'Mileage must be a whole number';

	return errors;
}

export function VehicleFormPage() {
	const { id } = useParams();
	const editing = Boolean(id);

	const existing = useQuery({
		queryKey: keys.vehicle(id ?? ''),
		queryFn: () => getVehicle(id as string),
		enabled: editing
	});

	if (editing && existing.isPending) {
		return <p className="py-10 text-[0.9375rem] text-text-muted">Loading…</p>;
	}

	if (editing && existing.isError) {
		return (
			<p role="alert" className="py-10 text-[0.9375rem] text-destructive">
				{existing.error instanceof Error ? existing.error.message : 'Vehicle not found'}
			</p>
		);
	}

	const loaded = existing.data?.vehicle;
	// Keyed on the row so the form is seeded from it at mount — see VendorFormPage.
	return <VehicleForm key={loaded?.id ?? 'new'} loaded={loaded} />;
}

function VehicleForm({ loaded }: { loaded: Vehicle | undefined }) {
	const { id } = useParams();
	const editing = Boolean(id);
	const leave = useLeave();
	const client = useQueryClient();

	/*
	 * A link to one field (`#vin`, from the vehicle's setup checklist) lands on it. The
	 * frame's delay lets the shell's scroll-to-top for the new screen run first.
	 */
	const { hash } = useLocation();
	useEffect(() => {
		const target = hash && document.getElementById(hash.slice(1));
		if (!target) return;
		const frame = requestAnimationFrame(() => {
			target.scrollIntoView({ block: 'center' });
			target.focus({ preventScroll: true });
		});
		return () => cancelAnimationFrame(frame);
	}, [hash]);

	const [form, setForm] = useState<FormState>(() => (loaded ? toForm(loaded) : BLANK));
	const [errors, setErrors] = useState<Errors>({});
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const [vinNote, setVinNote] = useState<string | null>(null);

	const vinComplete = form.vin.trim().length === 17;
	const lookup = useMutation({
		mutationFn: decodeVin,
		onMutate: () => setVinNote(null),
		onSuccess: (decoded) => {
			const { next, filled } = fillFromVin(form, decoded);
			setForm(next);
			setVinNote(describeFill(filled, decoded.checkDigitFailed));
		}
	});
	const vinError = lookup.error instanceof Error ? lookup.error.message : undefined;

	const title = loaded
		? loaded.nickname || `${loaded.year} ${loaded.make} ${loaded.model}`
		: 'New vehicle';

	useCrumbs(
		editing
			? [{ label: title, to: `/vehicles/${id}` }, { label: 'Edit' }]
			: [{ label: 'New vehicle' }]
	);

	const save = useMutation({
		mutationFn: (payload: VehicleInput) =>
			editing ? updateVehicle(id as string, payload) : createVehicle(payload),
		onSuccess: (vehicle) => {
			client.invalidateQueries({ queryKey: keys.vehicles });
			client.invalidateQueries({ queryKey: keys.vehicle(vehicle.id) });
			leave(`/vehicles/${vehicle.id}`);
		}
	});

	const remove = useMutation({
		mutationFn: () => deleteVehicle(id as string),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: keys.vehicles });
			leave('/vehicles', `/vehicles/${id}`);
		}
	});

	const field = <K extends keyof FormState>(key: K) => ({
		value: form[key],
		onChange: (value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }))
	});

	function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		const found = validate(form);
		setErrors(found);
		if (Object.keys(found).length === 0) save.mutate(toPayload(form));
	}

	const busy = save.isPending || remove.isPending;

	return (
		<>
			<h1 className="display text-[clamp(2rem,4vw,2.75rem)]">
				{editing ? 'Edit Vehicle' : 'Add Vehicle'}
			</h1>
			<p className="mt-3 text-[0.9375rem] text-text-muted">
				{editing ? "Update your vehicle's details." : 'Add a vehicle to your garage.'}
			</p>

			<form onSubmit={submit} noValidate className="card mt-10 max-w-xl p-6 sm:p-8">
				<div className="flex flex-col gap-5">
					<TextField
						id="vin"
						label="VIN"
						optional
						autoComplete="off"
						error={vinError}
						hint={vinNote ?? 'Look it up and the details below fill themselves in.'}
						action={
							<button
								type="button"
								onClick={() => lookup.mutate(form.vin.trim().toUpperCase())}
								disabled={!vinComplete || lookup.isPending}
								className="flex h-9 items-center gap-1.5 rounded-full bg-accent/15 px-3.5 text-[0.8125rem] font-medium text-accent-bright transition-colors hover:bg-accent/25 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-text-faint"
							>
								<Search className="size-3.5" strokeWidth={2} aria-hidden />
								{lookup.isPending ? 'Looking…' : 'Look up'}
							</button>
						}
						value={form.vin}
						onChange={(vin) => {
							// A stale "no record" under a VIN being corrected reads as a verdict on the new one.
							lookup.reset();
							setVinNote(null);
							setForm((prev) => ({ ...prev, vin }));
						}}
					/>
					<TextField
						id="year"
						label="Year"
						type="number"
						inputMode="numeric"
						error={errors.year}
						{...field('year')}
					/>
					<TextField id="make" label="Make" error={errors.make} {...field('make')} />
					<TextField id="model" label="Model" error={errors.model} {...field('model')} />
					<TextField id="trim" label="Trim" optional placeholder="Sahara" {...field('trim')} />
					<TextField id="nickname" label="Nickname" optional {...field('nickname')} />
					<SelectField
						id="bodyStyle"
						label="Body Style"
						optional
						options={BODY_STYLES}
						placeholder="Select a body style"
						{...field('bodyStyle')}
					/>
					<TextField id="color" label="Color" optional {...field('color')} />
					<TextField
						id="engineSize"
						label="Engine Size"
						optional
						placeholder="258ci"
						{...field('engineSize')}
					/>
					<TextField
						id="engineType"
						label="Engine Type"
						optional
						placeholder="I6"
						{...field('engineType')}
					/>
					<TextField
						id="transmission"
						label="Transmission"
						optional
						placeholder="3-Speed Manual"
						{...field('transmission')}
					/>
					<TextField
						id="drivetrain"
						label="Drivetrain"
						optional
						placeholder="4WD"
						{...field('drivetrain')}
					/>
					<TextField
						id="fuelType"
						label="Fuel Type"
						optional
						placeholder="Gasoline"
						{...field('fuelType')}
					/>
					<TextField
						id="currentMileage"
						label="Current Mileage"
						optional
						type="number"
						inputMode="numeric"
						error={errors.currentMileage}
						{...field('currentMileage')}
					/>
					<FileField
						anchor="image"
						label="Cover Image"
						imagesOnly
						value={form.image}
						onChange={(image) => setForm((prev) => ({ ...prev, image }))}
					/>

					{/* Renewal dates feed the reminders (src/lib/maintenance.ts) the same way
					    schedules do; the rest is what a glovebox usually has to hold. */}
					<div className="mt-3 border-t border-border pt-6">
						<h2 className="heading text-lg">Registration &amp; insurance</h2>
						<p className="mt-1 text-[0.875rem] text-text-muted">
							Expiry dates join your maintenance reminders.
						</p>
					</div>
					<div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
						<TextField
							id="licensePlate"
							label="License plate"
							optional
							{...field('licensePlate')}
						/>
						<TextField
							id="licensePlateState"
							label="State"
							optional
							{...field('licensePlateState')}
						/>
					</div>
					<TextField
						id="registrationExpiration"
						label="Registration expires"
						optional
						type="date"
						{...field('registrationExpiration')}
					/>
					<TextField
						id="inspectionExpiration"
						label="Inspection expires"
						optional
						type="date"
						{...field('inspectionExpiration')}
					/>
					<TextField
						id="emissionsExpiration"
						label="Emissions test expires"
						optional
						type="date"
						{...field('emissionsExpiration')}
					/>
					<TextField
						id="insuranceProvider"
						label="Insurance provider"
						optional
						{...field('insuranceProvider')}
					/>
					<TextField
						id="insurancePolicyNumber"
						label="Policy number"
						optional
						{...field('insurancePolicyNumber')}
					/>
					<TextField
						id="insuranceExpiration"
						label="Insurance expires"
						optional
						type="date"
						{...field('insuranceExpiration')}
					/>
				</div>

				{(save.isError || remove.isError) && (
					<p role="alert" className="mt-6 text-[0.875rem] text-destructive">
						{(save.error ?? remove.error) instanceof Error
							? (save.error ?? remove.error)!.message
							: 'Could not save your changes.'}
					</p>
				)}

				<div className="mt-8 flex flex-wrap gap-3">
					<button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
						{save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Vehicle'}
					</button>

					{editing &&
						(confirmingDelete ? (
							<div className="flex items-center gap-3">
								<button
									type="button"
									disabled={busy}
									onClick={() => remove.mutate()}
									className="rounded-full bg-destructive px-5 py-3 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
								>
									{remove.isPending ? 'Deleting…' : 'Delete permanently'}
								</button>
								<button
									type="button"
									onClick={() => setConfirmingDelete(false)}
									className="text-[0.9375rem] text-text-muted transition-colors hover:text-text"
								>
									Cancel
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => setConfirmingDelete(true)}
								className="flex items-center gap-2 rounded-full border border-destructive/40 px-5 py-3 text-[0.9375rem] text-destructive transition-colors hover:bg-destructive-bg"
							>
								<Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
								Delete Vehicle
							</button>
						))}
				</div>

				{confirmingDelete && (
					<p className="mt-4 text-[0.8125rem] text-text-muted">
						Deleting removes this vehicle's notes, repairs, galleries and schedules too. This cannot
						be undone.
					</p>
				)}
			</form>
		</>
	);
}
