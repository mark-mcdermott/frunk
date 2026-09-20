import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import {
	createSchedule,
	deleteSchedule,
	keys,
	updateSchedule,
	type Schedule
} from '../api';
import { TextField } from './Field';
import { formatDate, formatMiles } from '../format';

/**
 * Maintenance schedules, edited in place on the vehicle detail panel.
 *
 * **Why inline rather than a route.** A schedule is three fields — a name and one or
 * both intervals — attached to the vehicle already on screen. Every other form here is
 * a page because it edits a record with its own identity and its own breadcrumb; this
 * one has neither, and sending someone to `/vehicles/:id/schedules/new` and back for
 * "Oil change / 5000 miles" is navigation the record does not earn. There is no mock
 * for it either way.
 *
 * `createScheduleSchema` refuses a schedule with neither interval set, so the form does
 * too rather than letting the server answer that.
 */

interface Draft {
	name: string;
	intervalMiles: string;
	intervalMonths: string;
}

const BLANK: Draft = { name: '', intervalMiles: '', intervalMonths: '' };

const toDraft = (schedule: Schedule): Draft => ({
	name: schedule.name,
	intervalMiles: schedule.intervalMiles == null ? '' : String(schedule.intervalMiles),
	intervalMonths: schedule.intervalMonths == null ? '' : String(schedule.intervalMonths)
});

const asInt = (value: string) => (value.trim() ? Number(value) : null);

type Errors = Partial<Record<'name' | 'intervalMiles', string>>;

function validate(draft: Draft): Errors {
	const errors: Errors = {};
	if (!draft.name.trim()) errors.name = 'Name is required';

	const miles = asInt(draft.intervalMiles);
	const months = asInt(draft.intervalMonths);

	if (miles == null && months == null)
		errors.intervalMiles = 'Set a mileage interval, a month interval, or both';
	else if ([miles, months].some((n) => n != null && !Number.isInteger(n)))
		errors.intervalMiles = 'Intervals must be whole numbers';

	return errors;
}

function ScheduleForm({
	draft,
	onChange,
	errors,
	onCancel,
	onSubmit,
	busy,
	submitLabel
}: {
	draft: Draft;
	onChange: (draft: Draft) => void;
	errors: Errors;
	onCancel: () => void;
	onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
	busy: boolean;
	submitLabel: string;
}) {
	return (
		<form
			onSubmit={onSubmit}
			noValidate
			className="rounded-control border border-border bg-surface-raised p-4"
		>
			<div className="flex flex-col gap-4">
				<TextField
					id="schedule-name"
					label="Name"
					placeholder="Oil change"
					error={errors.name}
					value={draft.name}
					onChange={(name) => onChange({ ...draft, name })}
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<TextField
						id="schedule-miles"
						label="Every"
						type="number"
						inputMode="numeric"
						suffix="mi"
						placeholder="5000"
						error={errors.intervalMiles}
						value={draft.intervalMiles}
						onChange={(intervalMiles) => onChange({ ...draft, intervalMiles })}
					/>
					<TextField
						id="schedule-months"
						label="Or every"
						type="number"
						inputMode="numeric"
						suffix="months"
						placeholder="6"
						value={draft.intervalMonths}
						onChange={(intervalMonths) => onChange({ ...draft, intervalMonths })}
					/>
				</div>
			</div>

			<div className="mt-5 flex items-center gap-3">
				<button
					type="submit"
					disabled={busy}
					className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[0.875rem] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
				>
					<Check className="size-3.5" strokeWidth={2} aria-hidden />
					{busy ? 'Saving…' : submitLabel}
				</button>
				<button
					type="button"
					onClick={onCancel}
					className="flex items-center gap-2 text-[0.875rem] text-text-muted transition-colors hover:text-text"
				>
					<X className="size-3.5" strokeWidth={2} aria-hidden />
					Cancel
				</button>
			</div>
		</form>
	);
}

function ScheduleRow({
	schedule,
	onEdit,
	onDelete
}: {
	schedule: Schedule;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const interval = [
		schedule.intervalMiles != null && formatMiles(schedule.intervalMiles),
		schedule.intervalMonths != null &&
			`${schedule.intervalMonths} month${schedule.intervalMonths === 1 ? '' : 's'}`
	].filter(Boolean);

	const last = [
		schedule.lastCompletedDate && formatDate(schedule.lastCompletedDate),
		schedule.lastCompletedMileage != null && formatMiles(schedule.lastCompletedMileage)
	].filter(Boolean);

	return (
		<div className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0">
			<div className="min-w-0">
				<p className="truncate text-[0.9375rem] text-text">{schedule.name}</p>
				{last.length > 0 && (
					<p className="mt-1 text-[0.8125rem] text-text-faint">Last done {last.join(' at ')}</p>
				)}
			</div>

			<div className="flex shrink-0 items-center gap-4">
				<p className="hidden text-[0.8125rem] text-text-muted sm:block">
					Every {interval.join(' or ')}
				</p>
				<div className="flex items-center gap-2">
					<button
						type="button"
						aria-label={`Edit ${schedule.name}`}
						onClick={onEdit}
						className="flex size-8 items-center justify-center rounded-full border border-border text-text-muted transition-colors hover:border-text-muted hover:text-text"
					>
						<Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
					</button>
					<button
						type="button"
						aria-label={`Delete ${schedule.name}`}
						onClick={onDelete}
						className="flex size-8 items-center justify-center rounded-full border border-destructive/40 text-destructive transition-colors hover:bg-destructive-bg"
					>
						<Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
					</button>
				</div>
			</div>
		</div>
	);
}

export function ScheduleEditor({
	vehicleId,
	schedules
}: {
	vehicleId: string;
	schedules: Schedule[];
}) {
	const client = useQueryClient();
	/** `null` = nothing open, `'new'` = the add form, otherwise the id being edited. */
	const [open, setOpen] = useState<string | null>(null);
	const [draft, setDraft] = useState<Draft>(BLANK);
	const [errors, setErrors] = useState<Errors>({});

	const refresh = () => {
		setOpen(null);
		setErrors({});
		client.invalidateQueries({ queryKey: keys.vehicle(vehicleId) });
	};

	const add = useMutation({ mutationFn: createSchedule, onSuccess: refresh });
	const edit = useMutation({
		mutationFn: ({ id, ...body }: Draft & { id: string }) =>
			updateSchedule(id, {
				name: body.name.trim(),
				intervalMiles: asInt(body.intervalMiles),
				intervalMonths: asInt(body.intervalMonths)
			}),
		onSuccess: refresh
	});
	const remove = useMutation({ mutationFn: deleteSchedule, onSuccess: refresh });

	function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		const found = validate(draft);
		setErrors(found);
		if (Object.keys(found).length > 0) return;

		if (open === 'new') {
			add.mutate({
				vehicleId,
				name: draft.name.trim(),
				intervalMiles: asInt(draft.intervalMiles),
				intervalMonths: asInt(draft.intervalMonths)
			});
		} else if (open) {
			edit.mutate({ id: open, ...draft });
		}
	}

	const busy = add.isPending || edit.isPending || remove.isPending;
	const failure = add.error ?? edit.error ?? remove.error;

	return (
		<>
			{open !== 'new' && (
				<div className="mb-4 flex justify-end">
					<button
						type="button"
						onClick={() => {
							setDraft(BLANK);
							setErrors({});
							setOpen('new');
						}}
						className="flex items-center gap-1.5 rounded-full border border-accent/50 px-3 py-1.5 text-[0.8125rem] text-text transition-colors hover:bg-accent/10"
					>
						<Plus className="size-3.5 text-accent-bright" strokeWidth={2} aria-hidden />
						Add
					</button>
				</div>
			)}

			{open === 'new' && (
				<div className="mb-4">
					<ScheduleForm
						draft={draft}
						onChange={setDraft}
						errors={errors}
						busy={busy}
						submitLabel="Add schedule"
						onCancel={() => setOpen(null)}
						onSubmit={submit}
					/>
				</div>
			)}

			{failure && (
				<p role="alert" className="mb-4 text-[0.875rem] text-destructive">
					{failure instanceof Error ? failure.message : 'Could not save that schedule.'}
				</p>
			)}

			{schedules.length === 0 && open !== 'new' ? (
				<div className="flex flex-col items-center gap-3 py-10 text-center">
					<span
						aria-hidden
						className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent-bright"
					>
						<Plus className="size-5" strokeWidth={1.5} />
					</span>
					<h3 className="display-sm text-lg">No maintenance scheduled</h3>
					<p className="max-w-xs text-[0.875rem] text-text-muted">
						Add reminders to stay on top of maintenance.
					</p>
				</div>
			) : (
				schedules.map((schedule) =>
					open === schedule.id ? (
						<div key={schedule.id} className="py-4">
							<ScheduleForm
								draft={draft}
								onChange={setDraft}
								errors={errors}
								busy={busy}
								submitLabel="Save changes"
								onCancel={() => setOpen(null)}
								onSubmit={submit}
							/>
						</div>
					) : (
						<ScheduleRow
							key={schedule.id}
							schedule={schedule}
							onEdit={() => {
								setDraft(toDraft(schedule));
								setErrors({});
								setOpen(schedule.id);
							}}
							onDelete={() => remove.mutate(schedule.id)}
						/>
					)
				)
			)}
		</>
	);
}
