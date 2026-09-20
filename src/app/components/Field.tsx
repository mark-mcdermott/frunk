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
 * Form fields, built to `docs/mocks/vehicle-edit.webp`.
 *
 * shadcn's primitives ship at `h-8` with `text-sm` — a dense dashboard scale. The
 * mocks draw a taller, calmer field, so the sizing lives here rather than being
 * pasted onto every call site or edited into `src/components/ui/*`, which would be
 * overwritten the next time those are re-added.
 *
 * The label carries "(optional)" as muted text rather than marking required fields
 * with an asterisk: on this form most fields are optional, so the exception is what
 * is worth pointing at.
 */

const CONTROL =
	'h-[2.875rem] w-full rounded-control border-border bg-surface-raised px-4 text-[0.9375rem] text-text placeholder:text-text-faint focus-visible:border-accent focus-visible:ring-0';

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
	hint?: string;
	error?: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
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
	placeholder
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	optional?: boolean;
	hint?: string;
	error?: string;
	type?: 'text' | 'number';
	inputMode?: 'numeric';
	placeholder?: string;
}) {
	return (
		<FieldShell id={id} label={label} optional={optional} hint={hint} error={error}>
			<Input
				id={id}
				type={type}
				inputMode={inputMode}
				placeholder={placeholder}
				value={value}
				aria-invalid={error ? true : undefined}
				onChange={(event) => onChange(event.target.value)}
				className={CONTROL}
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
	options: readonly string[];
	optional?: boolean;
	hint?: string;
	error?: string;
	placeholder?: string;
}) {
	return (
		<FieldShell id={id} label={label} optional={optional} hint={hint} error={error}>
			{/* Base UI treats `null` as "no value", which is what makes the placeholder show
			    and what the API wants for a cleared column — so no sentinel is needed. */}
			<Select value={value} onValueChange={(next) => onChange(next === null ? null : String(next))}>
				<SelectTrigger id={id} className={`${CONTROL} justify-between font-normal`}>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{optional && (
						<SelectItem value={null} className="text-text-muted">
							{placeholder}
						</SelectItem>
					)}
					{options.map((option) => (
						<SelectItem key={option} value={option}>
							{option}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</FieldShell>
	);
}
