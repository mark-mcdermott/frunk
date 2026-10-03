import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCircle2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { assess, describeDue, TEMPLATES, type Assessment, type Template } from '@/lib/maintenance';
import {
	completeSchedule,
	createSchedule,
	deleteSchedule,
	keys,
	updateSchedule,
	type Schedule
} from '../api';
import { DuePill } from './DuePill';
import { EmptyState } from './EmptyState';
import { ScheduleSuggestions } from './ScheduleSuggestions';
import { TextField } from './Field';
import { formatDate, formatMiles, fromDateInput, toCents, toDateInput } from '../format';

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
 * Each row carries its verdict — overdue, due soon, on track, or not started — from
 * `assess`, the same rule the garage badges and the digest email use. **Mark done**
 * is the one action that changes it: it moves "last done", nudges the vehicle's
 * odometer forward if the mileage is higher, and logs the service as a repair unless
 * told not to, so the history is written once. The add form opens with the common
 * services as a starting point.
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

const toDraft = (schedule: Schedule | Template): Draft => ({
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

const FORM = 'rounded-control border border-border bg-surface-raised p-4';
const PRIMARY =
	'flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[0.875rem] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60';
const QUIET =
	'flex items-center gap-2 text-[0.875rem] text-text-muted transition-colors hover:text-text';
const ICON_BUTTON = 'flex size-8 items-center justify-center rounded-full border transition-colors';

function ScheduleForm({
	draft,
	onChange,
	errors,
	onCancel,
	onSubmit,
	busy,
	submitLabel,
	templates
}: {
	draft: Draft;
	onChange: (draft: Draft) => void;
	errors: Errors;
	onCancel: () => void;
	onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
	busy: boolean;
	submitLabel: string;
	templates?: boolean;
}) {
	return (
		<form onSubmit={onSubmit} noValidate className={FORM}>
			{templates && (
				<div className="mb-5">
					<p className="text-[0.8125rem] text-text-muted">Start from a common service</p>
					<div className="mt-2 flex flex-wrap gap-2">
						{TEMPLATES.map((template) => (
							<button
								key={template.name}
								type="button"
								onClick={() => onChange(toDraft(template))}
								className="rounded-full border border-border px-3 py-1 text-[0.8125rem] text-text-muted transition-colors hover:border-accent/60 hover:text-text"
							>
								{template.name}
							</button>
						))}
					</div>
				</div>
			)}

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
						grouped
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
				<button type="submit" disabled={busy} className={PRIMARY}>
					<Check className="size-3.5" strokeWidth={2} aria-hidden />
					{busy ? 'Saving…' : submitLabel}
				</button>
				<button type="button" onClick={onCancel} className={QUIET}>
					<X className="size-3.5" strokeWidth={2} aria-hidden />
					Cancel
				</button>
			</div>
		</form>
	);
}

interface Completion {
	date: string;
	mileage: string;
	cost: string;
	logRepair: boolean;
}

type CompletionErrors = Partial<Record<'date' | 'mileage' | 'cost', string>>;

function validateCompletion(draft: Completion): CompletionErrors {
	const errors: CompletionErrors = {};
	if (!draft.date) errors.date = 'Date is required';
	if (draft.mileage.trim() && !Number.isInteger(Number(draft.mileage)))
		errors.mileage = 'Mileage must be a whole number';
	if (draft.cost.trim() && !Number.isFinite(Number(draft.cost)))
		errors.cost = 'Cost must be an amount, like 45.00';
	return errors;
}

/** "Mark done": when, at what mileage, and whether to write it into the repair history. */
function CompleteForm({
	schedule,
	currentMileage,
	onDone,
	onCancel
}: {
	schedule: Schedule;
	currentMileage: number | null;
	onDone: () => void;
	onCancel: () => void;
}) {
	const [draft, setDraft] = useState<Completion>({
		date: toDateInput(new Date().toISOString()),
		mileage: currentMileage == null ? '' : String(currentMileage),
		cost: '',
		logRepair: true
	});
	const [errors, setErrors] = useState<CompletionErrors>({});

	const complete = useMutation({
		mutationFn: () =>
			completeSchedule(schedule.id, {
				date: fromDateInput(draft.date),
				mileage: draft.mileage.trim() ? Number(draft.mileage) : null,
				cost: draft.cost.trim() ? toCents(draft.cost) : null,
				logRepair: draft.logRepair
			}),
		onSuccess: onDone
	});

	function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		const found = validateCompletion(draft);
		setErrors(found);
		if (Object.keys(found).length > 0) return;
		complete.mutate();
	}

	return (
		<form onSubmit={submit} noValidate aria-label={`Mark ${schedule.name} done`} className={FORM}>
			<p className="text-[0.9375rem] font-semibold text-text">{schedule.name} — done</p>
			<div className="mt-4 grid gap-4 sm:grid-cols-3">
				<TextField
					id="complete-date"
					label="Date"
					type="date"
					error={errors.date}
					value={draft.date}
					onChange={(date) => setDraft({ ...draft, date })}
				/>
				<TextField
					id="complete-mileage"
					label="Mileage"
					optional
					grouped
					suffix="mi"
					error={errors.mileage}
					value={draft.mileage}
					onChange={(mileage) => setDraft({ ...draft, mileage })}
				/>
				<TextField
					id="complete-cost"
					label="Cost"
					optional
					inputMode="decimal"
					prefix="$"
					placeholder="45.00"
					error={errors.cost}
					value={draft.cost}
					onChange={(cost) => setDraft({ ...draft, cost })}
				/>
			</div>

			<label className="mt-4 flex items-center gap-2.5 text-[0.875rem] text-text">
				<input
					type="checkbox"
					checked={draft.logRepair}
					onChange={(event) => setDraft({ ...draft, logRepair: event.target.checked })}
					className="size-4 rounded accent-accent"
				/>
				Log this as a repair
			</label>

			{complete.isError && (
				<p role="alert" className="mt-3 text-[0.8125rem] text-destructive">
					{complete.error instanceof Error ? complete.error.message : 'Could not mark that done.'}
				</p>
			)}

			<div className="mt-5 flex items-center gap-3">
				<button type="submit" disabled={complete.isPending} className={PRIMARY}>
					<Check className="size-3.5" strokeWidth={2} aria-hidden />
					{complete.isPending ? 'Saving…' : 'Save'}
				</button>
				<button type="button" onClick={onCancel} className={QUIET}>
					<X className="size-3.5" strokeWidth={2} aria-hidden />
					Cancel
				</button>
			</div>
		</form>
	);
}

/** Urgent first: what needs doing outranks what is fine, and the alphabet comes last. */
const URGENCY: Record<Assessment['state'], number> = {
	overdue: 0,
	'due-soon': 1,
	ok: 2,
	unknown: 3
};

/** On track reads as a date to plan around; anything else reads as the distance to it. */
function dueLabel(assessment: Assessment): string {
	if (assessment.state === 'ok') {
		if (assessment.dueDate) return `Next ${formatDate(assessment.dueDate.toISOString())}`;
		if (assessment.dueMileage != null) return `Next at ${formatMiles(assessment.dueMileage)}`;
	}
	return describeDue(assessment);
}

function ScheduleRow({
	schedule,
	assessment,
	onComplete,
	onEdit,
	onDelete
}: {
	schedule: Schedule;
	assessment: Assessment;
	onComplete: () => void;
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
				<div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
					<DuePill assessment={assessment}>{dueLabel(assessment)}</DuePill>
					{last.length > 0 && (
						<span className="text-[0.8125rem] text-text-faint">Last done {last.join(' at ')}</span>
					)}
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-4">
				<p className="hidden text-[0.8125rem] text-text-muted sm:block">
					Every {interval.join(' or ')}
				</p>
				<div className="flex items-center gap-2">
					<button
						type="button"
						aria-label={`Mark ${schedule.name} done`}
						title="Mark done"
						onClick={onComplete}
						className={`${ICON_BUTTON} border-positive/40 text-positive hover:bg-positive-bg`}
					>
						<CheckCircle2 className="size-3.5" strokeWidth={1.75} aria-hidden />
					</button>
					<button
						type="button"
						aria-label={`Edit ${schedule.name}`}
						onClick={onEdit}
						className={`${ICON_BUTTON} border-border text-text-muted hover:border-text-muted hover:text-text`}
					>
						<Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
					</button>
					<button
						type="button"
						aria-label={`Delete ${schedule.name}`}
						onClick={onDelete}
						className={`${ICON_BUTTON} border-destructive/40 text-destructive hover:bg-destructive-bg`}
					>
						<Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
					</button>
				</div>
			</div>
		</div>
	);
}

/** Which form is open: the add form, an edit, or a "mark done", each for one schedule. */
type Open = { kind: 'new' } | { kind: 'edit'; id: string } | { kind: 'done'; id: string } | null;

export function ScheduleEditor({
	vehicleId,
	currentMileage,
	fuelType,
	schedules
}: {
	vehicleId: string;
	currentMileage: number | null;
	fuelType: string | null;
	schedules: Schedule[];
}) {
	const client = useQueryClient();
	const [open, setOpen] = useState<Open>(null);
	const [suggesting, setSuggesting] = useState(true);
	const [draft, setDraft] = useState<Draft>(BLANK);
	const [errors, setErrors] = useState<Errors>({});

	const refresh = () => {
		setOpen(null);
		setErrors({});
		client.invalidateQueries({ queryKey: keys.vehicle(vehicleId) });
	};

	/* A completion also writes a repair and may move the odometer, so the lists that
	   show either are refreshed along with the vehicle. */
	const completed = () => {
		refresh();
		client.invalidateQueries({ queryKey: keys.repairs });
		client.invalidateQueries({ queryKey: keys.vehicles });
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
	const remove = useMutation({ mutationFn: deleteSchedule, onSuccess: completed });

	function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		const found = validate(draft);
		setErrors(found);
		if (Object.keys(found).length > 0) return;

		if (open?.kind === 'new') {
			add.mutate({
				vehicleId,
				name: draft.name.trim(),
				intervalMiles: asInt(draft.intervalMiles),
				intervalMonths: asInt(draft.intervalMonths)
			});
		} else if (open?.kind === 'edit') {
			edit.mutate({ id: open.id, ...draft });
		}
	}

	const busy = add.isPending || edit.isPending || remove.isPending;
	const failure = add.error ?? edit.error ?? remove.error;
	const now = new Date();

	const assessed = schedules
		.map((schedule) => ({ schedule, assessment: assess(schedule, currentMileage, now) }))
		.sort(
			(a, b) =>
				URGENCY[a.assessment.state] - URGENCY[b.assessment.state] ||
				a.schedule.name.localeCompare(b.schedule.name)
		);

	return (
		<>
			{open?.kind !== 'new' && (
				<div className="mb-4 flex justify-end">
					<button
						type="button"
						onClick={() => {
							setDraft(BLANK);
							setErrors({});
							setOpen({ kind: 'new' });
						}}
						className="flex items-center gap-1.5 rounded-full border border-accent/50 px-3 py-1.5 text-[0.8125rem] text-text transition-colors hover:bg-accent/10"
					>
						<Plus className="size-3.5 text-accent-bright" strokeWidth={2} aria-hidden />
						Add
					</button>
				</div>
			)}

			{open?.kind === 'new' && (
				<div className="mb-4">
					<ScheduleForm
						draft={draft}
						onChange={setDraft}
						errors={errors}
						busy={busy}
						submitLabel="Add schedule"
						templates
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

			{schedules.length === 0 && open?.kind !== 'new' && suggesting ? (
				<ScheduleSuggestions
					vehicleId={vehicleId}
					currentMileage={currentMileage}
					fuelType={fuelType}
					onDismiss={() => setSuggesting(false)}
				/>
			) : schedules.length === 0 && open?.kind !== 'new' ? (
				<EmptyState
					compact
					title="No maintenance scheduled"
					line="Add reminders to stay on top of maintenance."
				/>
			) : (
				assessed.map(({ schedule, assessment }) => {
					if (open?.kind === 'edit' && open.id === schedule.id) {
						return (
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
						);
					}
					if (open?.kind === 'done' && open.id === schedule.id) {
						return (
							<div key={schedule.id} className="py-4">
								<CompleteForm
									schedule={schedule}
									currentMileage={currentMileage}
									onDone={completed}
									onCancel={() => setOpen(null)}
								/>
							</div>
						);
					}
					return (
						<ScheduleRow
							key={schedule.id}
							schedule={schedule}
							assessment={assessment}
							onComplete={() => {
								setErrors({});
								setOpen({ kind: 'done', id: schedule.id });
							}}
							onEdit={() => {
								setDraft(toDraft(schedule));
								setErrors({});
								setOpen({ kind: 'edit', id: schedule.id });
							}}
							onDelete={() => remove.mutate(schedule.id)}
						/>
					);
				})
			)}
		</>
	);
}
