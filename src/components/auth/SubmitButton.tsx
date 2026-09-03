import { ArrowRight, Loader2 } from 'lucide-react';

interface Props {
	label: string;
	/** Shown while the ceremony is open — a passkey prompt can sit there for a while. */
	pendingLabel: string;
	pending: boolean;
	disabled?: boolean;
}

/**
 * The mock's primary action: full-width, near-black, ~12px radius, with a violet arrow
 * held to the right edge. Squarer than the pill in DESIGN.md §5, which is what the
 * sign-in and sign-up mocks actually draw.
 *
 * The arrow is positioned rather than laid out so the label stays optically centred in
 * the button rather than centred in what is left over beside it.
 */
export function SubmitButton({ label, pendingLabel, pending, disabled }: Props) {
	return (
		<button
			type="submit"
			disabled={pending || disabled}
			aria-busy={pending}
			className="relative flex h-14 w-full items-center justify-center gap-3 rounded-[12px] bg-surface-elevated px-14 text-[0.9375rem] font-semibold text-[#fefefe] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
		>
			{pending && <Loader2 className="size-[1.125rem] animate-spin" aria-hidden />}
			<span>{pending ? pendingLabel : label}</span>
			{!pending && (
				<ArrowRight
					className="absolute right-6 size-5 text-accent-bright"
					strokeWidth={1.75}
					aria-hidden
				/>
			)}
		</button>
	);
}
