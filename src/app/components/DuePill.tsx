import type { ReactNode } from 'react';
import type { Assessment } from '@/lib/maintenance';

/**
 * The verdict on a schedule or a renewal, as a pill. One place for the colours so an
 * overdue oil change and an expired registration read as the same kind of trouble.
 */
const PILL: Record<Assessment['state'], string> = {
	overdue: 'bg-destructive-bg text-destructive',
	'due-soon': 'bg-warning-bg text-warning',
	ok: 'bg-positive-bg text-positive',
	unknown: 'border border-border text-text-muted'
};

export function DuePill({ assessment, children }: { assessment: Assessment; children: ReactNode }) {
	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium ${PILL[assessment.state]}`}
		>
			{children}
		</span>
	);
}
