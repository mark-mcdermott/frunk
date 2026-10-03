import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
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
import { useLeave } from '../history';
import { SelectField, TextAreaField, TextField, type Option } from '../components/Field';
import { FileField } from '../components/FileField';

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
 * The attachment uploads to the private Blob store (`FileField`) and accepts PDFs,
 * because "the note is the receipt" is this feature's whole use case.
 */

interface FormState {
	vehicleId: string | null;
	title: string;
	body: string;
	imageUrl: string | null;
}

type Errors = Partial<Record<'vehicleId' | 'title', string>>;

type ExistingNote = NoteRow | Awaited<ReturnType<typeof getNote>>['note'];

function toForm(note: ExistingNote): FormState {
	return {
		vehicleId: note.vehicleId,
		title: note.title,
		body: note.body ?? '',
		imageUrl: note.imageUrl
	};
}

export function NoteFormPage() {
	const { uuid } = useParams();
	const editing = Boolean(uuid);
	const client = useQueryClient();

	/* Arriving here almost always means passing through a list, so prefer the cache and
	   fall back to the endpoint only on a cold deep link. */
	const cached = client.getQueryData<NoteRow[]>(keys.notes)?.find((note) => note.uuid === uuid);

	const fetched = useQuery({
		queryKey: keys.note(uuid ?? ''),
		queryFn: () => getNote(uuid as string),
		enabled: editing && !cached
	});

	const existing = cached ?? fetched.data?.note;

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

	// Keyed on the row so the form is seeded from it at mount — see VendorFormPage.
	return <NoteForm key={existing?.uuid ?? 'new'} existing={existing} />;
}

function NoteForm({ existing }: { existing: ExistingNote | undefined }) {
	const { uuid } = useParams();
	const editing = Boolean(uuid);
	const [params] = useSearchParams();
	const leave = useLeave();
	const client = useQueryClient();

	const [form, setForm] = useState<FormState>(() =>
		existing
			? toForm(existing)
			: { vehicleId: params.get('vehicle'), title: '', body: '', imageUrl: null }
	);
	const [errors, setErrors] = useState<Errors>({});
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	const vehicles = useQuery({ queryKey: keys.vehicles, queryFn: listVehicles });

	/* A note lives on a vehicle OR a repair. The list cache only ever holds
	   vehicle-attached rows, so `repairId` comes from the detail fetch or the URL. */
	const repairId =
		(existing && 'repairId' in existing ? existing.repairId : null) ?? params.get('repair');

	const vehicleId = form.vehicleId;
	const vehicle = vehicles.data?.find((v) => v.id === vehicleId);
	const vehicleLabel = vehicle
		? vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`
		: null;

	useCrumbs([
		...(vehicleLabel && vehicleId ? [{ label: vehicleLabel, to: `/vehicles/${vehicleId}` }] : []),
		...(editing
			? [{ label: existing?.title ?? 'Note' }, { label: 'Edit' }]
			: [{ label: 'New note' }])
	]);

	const save = useMutation({
		mutationFn: (state: FormState) =>
			editing
				? updateNote(uuid as string, {
						title: state.title.trim(),
						body: state.body.trim() || null,
						imageUrl: state.imageUrl
					})
				: createNote({
						title: state.title.trim(),
						body: state.body.trim() || null,
						imageUrl: state.imageUrl,
						vehicleId: state.vehicleId ?? undefined,
						repairId: repairId ?? undefined
					}),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: keys.notes });
			if (editing) client.invalidateQueries({ queryKey: keys.note(uuid as string) });
			if (vehicleId) client.invalidateQueries({ queryKey: keys.vehicle(vehicleId) });
			if (repairId) client.invalidateQueries({ queryKey: keys.repair(repairId) });
			leave(repairId ? `/repairs/${repairId}` : vehicleId ? `/vehicles/${vehicleId}` : '/notes');
		}
	});

	const remove = useMutation({
		mutationFn: () => deleteNote(uuid as string),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: keys.notes });
			if (vehicleId) client.invalidateQueries({ queryKey: keys.vehicle(vehicleId) });
			if (repairId) client.invalidateQueries({ queryKey: keys.repair(repairId) });
			leave('/notes', `/notes/${uuid}`);
		}
	});

	function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		const found: Errors = {};
		if (!form.title.trim()) found.title = 'Title is required';
		if (!editing && !form.vehicleId && !repairId)
			found.vehicleId = 'Choose which vehicle this note is about';

		setErrors(found);
		if (Object.keys(found).length === 0) save.mutate(form);
	}

	const busy = save.isPending || remove.isPending;
	const vehicleOptions: Option[] = (vehicles.data ?? []).map((v) => ({
		value: v.id,
		label: v.nickname || `${v.year} ${v.make} ${v.model}`
	}));

	return (
		<>
			<h1 className="display text-[clamp(2rem,4vw,2.75rem)]">
				{editing ? 'Edit Note' : 'Add Note'}
			</h1>
			<p className="mt-3 text-[0.9375rem] text-text-muted">
				{editing ? 'Update this note.' : 'Anything about a vehicle worth remembering.'}
			</p>

			<form onSubmit={submit} noValidate className="card mt-10 max-w-xl p-6 sm:p-8">
				<div className="flex flex-col gap-5">
					{repairId ? (
						<p className="text-[0.875rem] text-text-muted">
							On{' '}
							<Link to={`/repairs/${repairId}`} className="text-accent-bright">
								this repair
							</Link>
						</p>
					) : editing ? (
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

					<FileField
						label="Attachment"
						value={form.imageUrl}
						onChange={(imageUrl) => setForm((prev) => ({ ...prev, imageUrl }))}
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
