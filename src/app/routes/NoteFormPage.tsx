import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useEffect, useState, type SubmitEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
	createNote,
	deleteNote,
	getNote,
	keys,
	listVehicles,
	updateNote,
	type NoteRow
} from '../api';
import { useCrumbs } from '../AppShell';
import { SelectField, TextAreaField, TextField, type Option } from '../components/Field';

/**
 * Add and edit a note, built to `docs/mocks/note-edit.webp`.
 *
 * `/notes/new?vehicle=<id>` preselects the vehicle, which is how `+ Add Note` on a
 * vehicle's detail screen arrives here already attached.
 *
 * **The vehicle cannot be changed after creation.** `updateNoteSchema` accepts only
 * `title`, `body`, `imageUrl` and `order` — reparenting is not in the API, so the form
 * states where the note lives rather than offering a select that would silently fail.
 *
 * **No image field.** The mock has one; uploads are a Vercel Blob job and
 * `BLOB_READ_WRITE_TOKEN` is not provisioned, so "Change Image" would do nothing.
 */

interface FormState {
	vehicleId: string | null;
	title: string;
	body: string;
}

type Errors = Partial<Record<'vehicleId' | 'title', string>>;

export function NoteFormPage() {
	const { uuid } = useParams();
	const editing = Boolean(uuid);
	const [params] = useSearchParams();
	const navigate = useNavigate();
	const client = useQueryClient();

	const [form, setForm] = useState<FormState>(() => ({
		vehicleId: params.get('vehicle'),
		title: '',
		body: ''
	}));
	const [errors, setErrors] = useState<Errors>({});
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	const vehicles = useQuery({ queryKey: keys.vehicles, queryFn: listVehicles });

	/* Arriving here almost always means passing through a list, so prefer the cache and
	   fall back to the endpoint only on a cold deep link. */
	const cached = client.getQueryData<NoteRow[]>(keys.notes)?.find((note) => note.uuid === uuid);

	const fetched = useQuery({
		queryKey: keys.note(uuid ?? ''),
		queryFn: () => getNote(uuid as string),
		enabled: editing && !cached
	});

	const existing = cached ?? fetched.data;
	useEffect(() => {
		if (existing) {
			setForm({
				vehicleId: existing.vehicleId,
				title: existing.title,
				body: existing.body ?? ''
			});
		}
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
					{ label: existing?.title ?? 'Note' },
					{ label: 'Edit' }
				]
			: [{ label: 'New note' }]
	);

	const save = useMutation({
		mutationFn: (state: FormState) =>
			editing
				? updateNote(uuid as string, {
						title: state.title.trim(),
						body: state.body.trim() || null
					})
				: createNote({
						title: state.title.trim(),
						body: state.body.trim() || null,
						vehicleId: state.vehicleId ?? undefined
					}),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: keys.notes });
			if (vehicleId) client.invalidateQueries({ queryKey: keys.vehicle(vehicleId) });
			navigate(vehicleId ? `/vehicles/${vehicleId}` : '/notes');
		}
	});

	const remove = useMutation({
		mutationFn: () => deleteNote(uuid as string),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: keys.notes });
			if (vehicleId) client.invalidateQueries({ queryKey: keys.vehicle(vehicleId) });
			navigate('/notes');
		}
	});

	function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		const found: Errors = {};
		if (!form.title.trim()) found.title = 'Title is required';
		if (!editing && !form.vehicleId) found.vehicleId = 'Choose which vehicle this note is about';

		setErrors(found);
		if (Object.keys(found).length === 0) save.mutate(form);
	}

	if (editing && !existing && fetched.isPending) {
		return <p className="py-10 text-[0.9375rem] text-text-muted">Loading…</p>;
	}

	if (editing && !existing && fetched.isError) {
		return (
			<p role="alert" className="py-10 text-[0.9375rem] text-destructive">
				{fetched.error instanceof Error ? fetched.error.message : 'Note not found'}
			</p>
		);
	}

	const busy = save.isPending || remove.isPending;
	const vehicleOptions: Option[] = (vehicles.data ?? []).map((v) => ({
		value: v.id,
		label: v.nickname || `${v.year} ${v.make} ${v.model}`
	}));

	return (
		<>
			<Link
				to="/notes"
				className="inline-flex items-center gap-2 text-[0.9375rem] text-accent-bright transition-opacity hover:opacity-80"
			>
				<ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
				Back to notes
			</Link>

			<h1 className="display mt-6 text-[clamp(2rem,4vw,2.75rem)]">
				{editing ? 'Edit Note' : 'Add Note'}
			</h1>
			<p className="mt-3 text-[0.9375rem] text-text-muted">
				{editing ? 'Update this note.' : 'Anything about a vehicle worth remembering.'}
			</p>

			<form onSubmit={submit} noValidate className="card mt-10 max-w-xl p-6 sm:p-8">
				<div className="flex flex-col gap-5">
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
						id="title"
						label="Title"
						placeholder="Oil change receipt"
						error={errors.title}
						value={form.title}
						onChange={(value) => setForm((prev) => ({ ...prev, title: value }))}
					/>

					<TextAreaField
						id="body"
						label="Note"
						optional
						rows={6}
						maxLength={500}
						value={form.body}
						onChange={(value) => setForm((prev) => ({ ...prev, body: value }))}
					/>
				</div>

				{(save.isError || remove.isError) && (
					<p role="alert" className="mt-6 text-[0.875rem] text-destructive">
						{(save.error ?? remove.error) instanceof Error
							? (save.error ?? remove.error)!.message
							: 'Could not save this note.'}
					</p>
				)}

				<div className="mt-8 flex flex-wrap gap-3">
					<button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
						{save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Note'}
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
								Delete Note
							</button>
						))}
				</div>

				{confirmingDelete && (
					<p className="mt-4 text-[0.8125rem] text-text-muted">
						Any notes nested under this one are deleted with it. This cannot be undone.
					</p>
				)}
			</form>
		</>
	);
}
