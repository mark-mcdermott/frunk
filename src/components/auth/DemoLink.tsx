import { PlayCircle } from 'lucide-react';
import { useState } from 'react';
import { authErrorMessage, startDemo } from '../../lib/auth-client';
import { setUser } from '../../stores/user';
import { AFTER_AUTH } from './destination';

interface Props {
	onError: (message: string) => void;
}

/**
 * "Try the demo" occupies the slot the mocks give to Google / Apple / GitHub, which
 * Decision 2 superseded. It is the more valuable button anyway: a demo visitor gets a
 * real account they can convert without losing anything (Decision 5), so this is the
 * conversion path, not a detour around it.
 */
export function DemoLink({ onError }: Props) {
	const [pending, setPending] = useState(false);

	async function begin() {
		setPending(true);
		onError('');
		try {
			setUser(await startDemo());
			window.location.assign(AFTER_AUTH);
		} catch (cause) {
			onError(authErrorMessage(cause));
			setPending(false);
		}
	}

	return (
		<div>
			<div className="flex items-center gap-4">
				<span className="h-px flex-1 bg-border" />
				<span className="text-[0.8125rem] text-text-muted">or</span>
				<span className="h-px flex-1 bg-border" />
			</div>

			<button
				type="button"
				onClick={begin}
				disabled={pending}
				aria-busy={pending}
				className="mt-5 flex h-[3.25rem] w-full items-center justify-center gap-2.5 rounded-control border border-border-strong text-[0.9375rem] font-medium text-text transition-colors hover:bg-surface disabled:opacity-60"
			>
				<PlayCircle className="size-[1.125rem] text-accent-text" strokeWidth={1.75} aria-hidden />
				{pending ? 'Starting the demo…' : 'Explore the demo'}
			</button>
			<p className="mt-3 text-center text-[0.8125rem] text-text-muted">
				A real account with sample data. Add a passkey later to keep it.
			</p>
		</div>
	);
}
