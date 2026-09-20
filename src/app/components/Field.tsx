import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';

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
				{optional && <span className="font-normal text-text-muted">{' '}(optional)</span>}
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
	placeholder,
	prefix,
	suffix
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	optional?: boolean;
	hint?: ReactNode;
	error?: string;
	type?: 'text' | 'number' | 'date';
	inputMode?: 'numeric' | 'decimal';
	placeholder?: string;
	/** Static adornments — the mock's `$` on cost and `mi` on mileage. */
	prefix?: string;
	suffix?: string;
}) {
	return (
		<FieldShell id={id} label={label} optional={optional} hint={hint} error={error}>
			<div className="relative">
				{prefix && (
					<span
						aria-hidden
						className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[0.9375rem] text-text-muted"
					>
						{prefix}
					</span>
				)}
				<Input
					id={id}
					type={type}
					inputMode={inputMode}
					placeholder={placeholder}
					value={value}
					aria-invalid={error ? true : undefined}
					onChange={(event) => onChange(event.target.value)}
					className={`${CONTROL} ${CONTROL_H} ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-12' : ''}`}
				/>
				{suffix && (
					<span
						aria-hidden
						className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[0.8125rem] text-text-muted"
					>
						{suffix}
					</span>
				)}
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
				className={`${CONTROL} resize-y border py-3 outline-none transition-colors focus:border-accent`}
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
				<SelectTrigger
					id={id}
					className={`${CONTROL} ${CONTROL_H} justify-between font-normal`}
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

/** `options` where the value is also the label — the common case. */
export const plainOptions = (labels: readonly string[]): Option[] =>
	labels.map((label) => ({ value: label, label }));
