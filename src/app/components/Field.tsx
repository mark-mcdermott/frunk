import { Autocomplete } from '@base-ui/react/autocomplete';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { groupDigits, onlyDigits } from '../format';

/**
 * Form fields, built to `docs/mocks/vehicle-edit.webp` and `repair-edit.webp`.
 *
 * shadcn's primitives ship at `h-8` with `text-sm` — a dense dashboard scale. The
 * mocks draw a taller, calmer field, so the sizing lives here rather than being
 * pasted onto every call site or edited into `src/components/ui/*`, which would be
 * overwritten the next time those are re-added.
 *
 * The label carries "(optional)" as muted text rather than marking required fields
 * with an asterisk: on these forms most fields are optional, so the exception is what
 * is worth pointing at. (The mocks use a red `*` on required fields; that reads as an
 * error colour on a form where nothing is wrong yet.)
 */

const CONTROL =
	'w-full rounded-control border-border bg-surface-raised px-4 text-[0.9375rem] text-text placeholder:text-text-faint focus-visible:border-accent focus-visible:ring-0';
const CONTROL_H = 'h-[2.875rem]';

export interface Option {
	value: string;
	label: string;
}

function FieldShell({
	id,
	label,
	optional,
	hint,
	error,
	children
}: {
	id: string;
	label: string;
	optional?: boolean;
	hint?: ReactNode;
	error?: string;
	children: ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-2">
			<Label htmlFor={id} className="text-[0.8125rem] text-text">
				{label}
				{/* The gap is CSS, so the accessible name needs its own space. */}
				{optional && <span className="font-normal text-text-muted"> (optional)</span>}
			</Label>

			{children}

			{error ? (
				<p role="alert" className="text-[0.8125rem] text-destructive">
					{error}
				</p>
			) : (
				hint && <p className="text-[0.8125rem] text-text-muted">{hint}</p>
			)}
		</div>
	);
}

export function TextField({
	id,
	label,
	value,
	onChange,
	optional,
	hint,
	error,
	type = 'text',
	inputMode,
	autoComplete,
	placeholder,
	prefix,
	suffix,
	action,
	grouped = false
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	optional?: boolean;
	hint?: ReactNode;
	error?: string;
	type?: 'text' | 'number' | 'date' | 'email';
	inputMode?: 'numeric' | 'decimal';
	autoComplete?: string;
	placeholder?: string;
	/** Static adornments — the mock's `$` on cost and `mi` on mileage. */
	prefix?: string;
	suffix?: string;
	/** A control inside the field's right edge, like a search box's button. */
	action?: ReactNode;
	/**
	 * A whole number shown with thousands separators. `value` and `onChange` stay bare
	 * digits, so the form's state and payload never see a comma.
	 */
	grouped?: boolean;
}) {
	const input = useRef<HTMLInputElement>(null);
	/* Digits left of the caret after an edit. Inserting a separator changes the text, which
	   sends a controlled input's caret to the end; this puts it back after the same digit. */
	const caret = useRef<number | null>(null);

	useLayoutEffect(() => {
		const element = input.current;
		if (caret.current == null || !element) return;
		let position = 0;
		for (let seen = 0; position < element.value.length && seen < caret.current; position++) {
			if (/\d/.test(element.value[position] ?? '')) seen++;
		}
		element.setSelectionRange(position, position);
		caret.current = null;
	}, [value]);

	return (
		<FieldShell id={id} label={label} optional={optional} hint={hint} error={error}>
			<div className="relative">
				{prefix && (
					<span
						aria-hidden
						className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[0.9375rem] text-text-muted"
					>
						{prefix}
					</span>
				)}
				<Input
					id={id}
					ref={input}
					type={grouped ? 'text' : type}
					inputMode={grouped ? 'numeric' : inputMode}
					autoComplete={autoComplete}
					placeholder={placeholder}
					value={grouped ? groupDigits(value) : value}
					aria-invalid={error ? true : undefined}
					onChange={(event) => {
						if (!grouped) return onChange(event.target.value);
						const typed = event.target.value;
						caret.current = onlyDigits(
							typed.slice(0, event.target.selectionStart ?? typed.length)
						).length;
						onChange(onlyDigits(typed));
					}}
					className={`${CONTROL} ${CONTROL_H} ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-12' : ''} ${action ? 'pr-28' : ''}`}
				/>
				{suffix && (
					<span
						aria-hidden
						className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[0.8125rem] text-text-muted"
					>
						{suffix}
					</span>
				)}
				{action && <div className="absolute top-1/2 right-1.5 -translate-y-1/2">{action}</div>}
			</div>
		</FieldShell>
	);
}

export function TextAreaField({
	id,
	label,
	value,
	onChange,
	optional,
	hint,
	error,
	rows = 4,
	maxLength
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	optional?: boolean;
	hint?: ReactNode;
	error?: string;
	rows?: number;
	maxLength?: number;
}) {
	return (
		<FieldShell
			id={id}
			label={label}
			optional={optional}
			error={error}
			hint={
				maxLength ? (
					<span className="block text-right tabular-nums">
						{value.length}/{maxLength}
					</span>
				) : (
					hint
				)
			}
		>
			<textarea
				id={id}
				rows={rows}
				maxLength={maxLength}
				value={value}
				aria-invalid={error ? true : undefined}
				onChange={(event) => onChange(event.target.value)}
				className={`${CONTROL} resize-y border py-3 transition-colors outline-none focus:border-accent`}
			/>
		</FieldShell>
	);
}

export function SelectField({
	id,
	label,
	value,
	onChange,
	options,
	optional,
	hint,
	error,
	placeholder = 'Select…'
}: {
	id: string;
	label: string;
	value: string | null;
	onChange: (value: string | null) => void;
	options: readonly Option[];
	optional?: boolean;
	hint?: ReactNode;
	error?: string;
	placeholder?: string;
}) {
	return (
		<FieldShell id={id} label={label} optional={optional} hint={hint} error={error}>
			{/* Base UI treats `null` as "no value", which is what makes the placeholder show
			    and what the API wants for a cleared column — so no sentinel is needed. */}
			<Select value={value} onValueChange={(next) => onChange(next === null ? null : String(next))}>
				{/* The trigger sizes itself with `data-[size=default]:h-8`, which outranks a plain
				    height class, so the field height is restated under the same selector. */}
				<SelectTrigger
					id={id}
					className={`${CONTROL} ${CONTROL_H} justify-between font-normal data-[size=default]:h-[2.875rem]`}
					aria-invalid={error ? true : undefined}
				>
					<SelectValue placeholder={placeholder}>
						{(current) => options.find((o) => o.value === current)?.label ?? placeholder}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{optional && (
						<SelectItem value={null} className="text-text-muted">
							{placeholder}
						</SelectItem>
					)}
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</FieldShell>
	);
}

export interface Suggestion {
	value: string;
	/** A CSS colour drawn as a dot beside the value — the colour field's swatches. */
	swatch?: string;
}

function Swatch({ color }: { color: string }) {
	return (
		<span
			aria-hidden
			className="size-4 shrink-0 rounded-full border border-border-strong"
			style={{ background: color }}
		/>
	);
}

/**
 * Free text with a list of likely answers under it.
 *
 * For fields where most people pick one of a handful of values but anyone may need to
 * type their own — a colour, a model. Base UI's Autocomplete, not a select: the value is
 * whatever is in the box, and the list only filters as you type. A native `<datalist>`
 * would be less code, but on iOS it is a strip above the keyboard, not a list
 * (dogfooding, 2026-10-02).
 */
export function SuggestField({
	id,
	label,
	value,
	onChange,
	suggestions,
	optional,
	hint,
	error,
	placeholder,
	notice,
	onFocusChange
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	suggestions: readonly Suggestion[];
	/** Said in the list when nothing matches — "Looking up…", "Enter the make first". */
	notice?: string;
	/** For suggestions worth fetching only while the field is in use. */
	onFocusChange?: (focused: boolean) => void;
	optional?: boolean;
	hint?: ReactNode;
	error?: string;
	placeholder?: string;
}) {
	const query = value.trim().toLowerCase();
	const chosen = suggestions.find((s) => s.value.toLowerCase() === query);

	/*
	 * Open only with something to show. While its list is open, Base UI hides the rest of
	 * the page from assistive tech to keep a screen reader in the list; a list with
	 * nothing in it would do that for no reason, and a value of one's own is the normal
	 * case here, not an error to report.
	 */
	const [wanted, setWanted] = useState(false);
	const matches = suggestions.some((s) => s.value.toLowerCase().includes(query));
	const open = wanted && (matches || Boolean(notice));

	return (
		<FieldShell id={id} label={label} optional={optional} hint={hint} error={error}>
			<Autocomplete.Root
				items={suggestions}
				itemToStringValue={(item: Suggestion) => item.value}
				value={value}
				onValueChange={(next) => onChange(next)}
				open={open}
				onOpenChange={setWanted}
				openOnInputClick
				mode="list"
			>
				<div className="relative">
					{chosen?.swatch && (
						<span className="pointer-events-none absolute top-1/2 left-4 flex -translate-y-1/2">
							<Swatch color={chosen.swatch} />
						</span>
					)}
					<Autocomplete.Input
						id={id}
						placeholder={placeholder}
						autoComplete="off"
						onFocus={() => onFocusChange?.(true)}
						onBlur={() => onFocusChange?.(false)}
						aria-invalid={error ? true : undefined}
						className={`${CONTROL} ${CONTROL_H} border transition-colors outline-none focus:border-accent ${chosen?.swatch ? 'pl-11' : ''}`}
					/>
				</div>
				<Autocomplete.Portal>
					<Autocomplete.Positioner sideOffset={6} className="z-50 outline-none">
						<Autocomplete.Popup className="max-h-[min(18rem,var(--available-height))] w-[var(--anchor-width)] overflow-y-auto rounded-control border border-border bg-surface-raised p-1.5 shadow-lg transition-opacity duration-100 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
							<Autocomplete.Empty className="px-3 py-2 text-[0.8125rem] text-text-muted empty:hidden">
								{notice}
							</Autocomplete.Empty>
							<Autocomplete.List>
								{(item: Suggestion) => (
									<Autocomplete.Item
										key={item.value}
										value={item}
										className="flex cursor-default items-center gap-3 rounded-[8px] px-3 py-2.5 text-[0.9375rem] text-text outline-none select-none data-[highlighted]:bg-muted"
									>
										{item.swatch && <Swatch color={item.swatch} />}
										{item.value}
									</Autocomplete.Item>
								)}
							</Autocomplete.List>
						</Autocomplete.Popup>
					</Autocomplete.Positioner>
				</Autocomplete.Portal>
			</Autocomplete.Root>
		</FieldShell>
	);
}

/** `options` where the value is also the label — the common case. */
export const plainOptions = (labels: readonly string[]): Option[] =>
	labels.map((label) => ({ value: label, label }));
