interface Props {
	message: string | null;
}

/**
 * `role="alert"` so the message is announced when it appears — a passkey prompt takes
 * focus away from the page, and someone using a screen reader would otherwise have no
 * idea the attempt came back with anything.
 */
export function FormError({ message }: Props) {
	if (!message) return null;
	return (
		<p
			role="alert"
			className="rounded-control bg-destructive-bg px-4 py-3 text-sm leading-relaxed text-destructive"
		>
			{message}
		</p>
	);
}
