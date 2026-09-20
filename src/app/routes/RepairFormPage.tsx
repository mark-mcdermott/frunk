import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useEffect, useState, type SubmitEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
	createRepair,
	deleteRepair,
	getRepair,
	keys,
	listVehicles,
	listVendors,
	updateRepair,
	type RepairInput,
	type RepairRow,
	type RepairStatus
} from '../api';
import { useCrumbs } from '../AppShell';
import { SelectField, TextField, type Option } from '../components/Field';
import { fromCents, fromDateInput, toCents, toDateInput } from '../format';

/**
 * Add and edit a repair, built to `docs/mocks/repair-edit.webp`.
 *
 * `/repairs/new?vehicle=<id>` preselects the vehicle, which is how the `+ Add Repair`
 * button on a vehicle's detail screen arrives here without a second picker step.
 *
 * **Three departures from the mock:**
 *
 * - **Cost and Vendor are optional.** The mock marks both with a required asterisk, but
 *   `createRepairSchema` has them nullable, and they genuinely are — you log an oil
 *   change you did yourself, at a price you have not looked up yet.
 * - **No Notes textarea.** The mock draws one, which implies a `notes` column on the
 *   repair. There is none: notes are their own rows attached by `repairId`, so a box
 *   here would either silently drop its text or quietly create a note the Notes screen
 *   then shows as a separate thing. Attach notes from the Notes screen instead.
 * - **No attachments.** Uploads are a Vercel Blob job and `BLOB_READ_WRITE_TOKEN` is
 *   not provisioned, so the whole drag-and-drop block would do nothing.
 */

const STATUSES: Option[] = [
	{ value: 'completed', label: 'Completed' },
	{ value: 'scheduled', label: 'Scheduled' },
	{ value: 'in_progress', label: 'In progress' }
];

interface FormState {
	vehicleId: string | null;
	description: string;
	date: string;
	mileage: string;
	cost: string;
	vendorId: string | null;
	status: RepairStatus;
}

const today = () => toDateInput(new Date().toISOString());

const BLANK: FormState = {
	vehicleId: null,
	description: '',
	date: today(),
	mileage: '',
	cost: '',
	vendorId: null,
	status: 'completed'
};

function toForm(repair: Omit<RepairRow, 'vehicleMake' | 'vehicleModel' | 'vehicleYear'>): FormState {
	return {
		vehicleId: repair.vehicleId,
		description: repair.description,
		date: toDateInput(repair.date),
		mileage: repair.mileage == null ? '' : String(repair.mileage),
		cost: repair.cost == null ? '' : fromCents(repair.cost),
		vendorId: repair.vendorId,
		status: repair.status as RepairStatus
	};
}

type Errors = Partial<Record<'vehicleId' | 'description' | 'date' | 'mileage' | 'cost', string>>;

function validate(form: FormState, editing: boolean): Errors {
	const errors: Errors = {};

	if (!editing && !form.vehicleId) errors.vehicleId = 'Choose which vehicle this was for';
	if (!form.description.trim()) errors.description = 'Description is required';
	if (!form.date) errors.date = 'Date is required';

	if (form.mileage.trim() && !Number.isInteger(Number(form.mileage)))
		errors.mileage = 'Mileage must be a whole number';

	if (form.cost.trim() && !Number.isFinite(Number(form.cost)))
		errors.cost = 'Cost must be an amount, like 45.00';

	return errors;
}

export function RepairFormPage() {
	const { id } = useParams();
	const editing = Boolean(id);
	const [params] = useSearchParams();
	const navigate = useNavigate();
	const client = useQueryClient();

	const [form, setForm] = useState<FormState>(() => ({
		...BLANK,
		vehicleId: params.get('vehicle')
	}));
	const [errors, setErrors] = useState<Errors>({});
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	const vehicles = useQuery({ queryKey: keys.vehicles, queryFn: listVehicles });
	const vendors = useQuery({ queryKey: keys.vendors, queryFn: listVendors });

	/*
	 * There is a `GET /api/repairs/:id`, but the list is almost always already cached —
	 * arriving here means passing through the index or a vehicle screen. Reading the row
	 * out of it saves a request; the `enabled` guard falls back to the endpoint when the
	 * cache is cold, such as on a deep link.
	 */
	const cached = client
		.getQueryData<RepairRow[]>(keys.repairs)
		?.find((repair) => repair.id === id);

	const fetched = useQuery({
		queryKey: keys.repair(id ?? ''),
		queryFn: () => getRepair(id as string),
		enabled: editing && !cached
	});

	const existing = cached ?? fetched.data?.repair;
	useEffect(() => {
		if (existing) setForm(toForm(existing));
	}, [existing]);

	const vehicleId = form.vehicleId;
	const vehicle = vehicles.data?.find((v) => v.id === vehicleId);
	const vehicleLabel = vehicle
		? vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`
		: null;

	useCrumbs(
		editing
			? [
					...(vehicleLabel && vehicleId
						? [{ label: vehicleLabel, to: `/vehicles/${vehicleId}` }]
						: []),
					{ label: existing?.description ?? 'Repair' },
					{ label: 'Edit' }
				]
			: [{ label: 'New repair' }]
	);

	const save = useMutation({
		mutationFn: (payload: RepairInput) => {
			const { vehicleId: _vehicle, ...rest } = payload;
			return editing ? updateRepair(id as string, rest) : createRepair(payload);
		},
		onSuccess: (saved) => {
			client.invalidateQueries({ queryKey: keys.repairs });
			if (editing) client.invalidateQueries({ queryKey: keys.repair(id as string) });
			if (vehicleId) client.invalidateQueries({ queryKey: keys.vehicle(vehicleId) });
			navigate(`/repairs/${saved.id}`);
		}
	});

	const remove = useMutation({
		mutationFn: () => deleteRepair(id as string),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: keys.repairs });
			if (vehicleId) client.invalidateQueries({ queryKey: keys.vehicle(vehicleId) });
			navigate('/repairs');
		}
	});

	function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		const found = validate(form, editing);
		setErrors(found);
		if (Object.keys(found).length > 0) return;

		save.mutate({
			vehicleId: form.vehicleId ?? undefined,
			description: form.description.trim(),
			/*
			 * `<input type="date">` carries no time, so sending it back always would
			 * collapse the stored timestamp to local midnight — rewriting the date on an
			 * edit that only touched the cost. Send the original whenever the calendar day
			 * is untouched, and a fresh local-midnight value only when it actually changed.
			 */
			date:
				existing && form.date === toDateInput(existing.date)
					? existing.date
					: fromDateInput(form.date),
			mileage: form.mileage.trim() ? Number(form.mileage) : null,
			cost: form.cost.trim() ? toCents(form.cost) : null,
			vendorId: form.vendorId,
			status: form.status
		});
	}

	if (editing && !existing && fetched.isPending) {
		return <p className="py-10 text-[0.9375rem] text-text-muted">Loading…</p>;
	}

	if (editing && !existing && fetched.isError) {
		return (
			<p role="alert" className="py-10 text-[0.9375rem] text-destructive">
				{fetched.error instanceof Error ? fetched.error.message : 'Repair not found'}
			</p>
		);
	}

	const busy = save.isPending || remove.isPending;
	const vehicleOptions: Option[] = (vehicles.data ?? []).map((v) => ({
		value: v.id,
		label: v.nickname || `${v.year} ${v.make} ${v.model}`
	}));
	const vendorOptions: Option[] = (vendors.data ?? []).map((v) => ({
		value: v.id,
		label: v.name
	}));

	return (
		<>
			<Link
				to="/repairs"
				className="inline-flex items-center gap-2 text-[0.9375rem] text-accent-bright transition-opacity hover:opacity-80"
			>
				<ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
				Back to repairs
			</Link>

			<h1 className="display mt-6 text-[clamp(2rem,4vw,2.75rem)]">
				{editing ? 'Edit Repair' : 'Add Repair'}
			</h1>
			<p className="mt-3 text-[0.9375rem] text-text-muted">
				{editing ? 'Update the details for this repair.' : 'Log a service on one of your vehicles.'}
			</p>

			<form onSubmit={submit} noValidate className="card mt-10 max-w-2xl p-6 sm:p-8">
				<div className="flex flex-col gap-5">
					{/* The vehicle is fixed after creation — `updateRepairSchema` omits it, so
					    moving a repair between vehicles is not something the API allows. */}
					{editing ? (
						<p className="text-[0.875rem] text-text-muted">
							On{' '}
							{vehicleId ? (
								<Link to={`/vehicles/${vehicleId}`} className="text-accent-bright">
									{vehicleLabel ?? 'this vehicle'}
								</Link>
							) : (
								'this vehicle'
							)}
						</p>
					) : (
						<SelectField
							id="vehicleId"
							label="Vehicle"
							options={vehicleOptions}
							placeholder={vehicles.isPending ? 'Loading…' : 'Choose a vehicle'}
							error={errors.vehicleId}
							value={form.vehicleId}
							onChange={(value) => setForm((prev) => ({ ...prev, vehicleId: value }))}
						/>
					)}

					<TextField
						id="description"
						label="Description"
						placeholder="Oil change"
						error={errors.description}
						value={form.description}
						onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
					/>

					<div className="grid gap-5 sm:grid-cols-2">
						<TextField
							id="date"
							label="Date"
							type="date"
							error={errors.date}
							value={form.date}
							onChange={(value) => setForm((prev) => ({ ...prev, date: value }))}
						/>
						<TextField
							id="mileage"
							label="Mileage"
							optional
							type="number"
							inputMode="numeric"
							suffix="mi"
							error={errors.mileage}
							value={form.mileage}
							onChange={(value) => setForm((prev) => ({ ...prev, mileage: value }))}
						/>
					</div>

					<div className="grid gap-5 sm:grid-cols-2">
						<TextField
							id="cost"
							label="Cost"
							optional
							inputMode="decimal"
							prefix="$"
							placeholder="45.00"
							error={errors.cost}
							value={form.cost}
							onChange={(value) => setForm((prev) => ({ ...prev, cost: value }))}
						/>
						<SelectField
							id="status"
							label="Status"
							options={STATUSES}
							value={form.status}
							onChange={(value) =>
								setForm((prev) => ({ ...prev, status: (value ?? 'completed') as RepairStatus }))
							}
						/>
					</div>

					<SelectField
						id="vendorId"
						label="Vendor"
						optional
						options={vendorOptions}
						placeholder={vendors.isPending ? 'Loading…' : 'No vendor'}
						hint={
							<>
								<Link to="/vendors" className="text-accent-bright">
									Add a vendor
								</Link>{' '}
								to track where repairs are done.
							</>
						}
						value={form.vendorId}
						onChange={(value) => setForm((prev) => ({ ...prev, vendorId: value }))}
					/>
				</div>

				{(save.isError || remove.isError) && (
					<p role="alert" className="mt-6 text-[0.875rem] text-destructive">
						{(save.error ?? remove.error) instanceof Error
							? (save.error ?? remove.error)!.message
							: 'Could not save this repair.'}
					</p>
				)}

				<div className="mt-8 flex flex-wrap gap-3">
					<button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
						{save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Repair'}
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
								Delete Repair
							</button>
						))}
				</div>
			</form>
		</>
	);
}
