import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { getRecalls, keys, type Recall, type Vehicle } from '../api';
import { formatDate, fromDateInput } from '../format';
import { EmptyState } from './EmptyState';

/**
 * NHTSA's recalls for the vehicle's model year (`GET /api/vehicles/:id/recalls`).
 *
 * Information the app brings without the owner typing anything, which is the point
 * (dogfooding, 2026-10-02). A recall is filed per model, so the list says what *may*
 * apply; whether this particular car was fixed is the VIN lookup on nhtsa.gov, linked
 * when the VIN is known. A failed lookup is a quiet line, not an alarm: the rest of the
 * page does not depend on it.
 */

const SHOWN = 3;

function RecallItem({ recall }: { recall: Recall }) {
	return (
		<details className="group rounded-control border border-border bg-surface-raised">
			<summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
				<span className="min-w-0">
					<span className="block text-[0.9375rem] font-semibold text-text">{recall.component}</span>
					<span className="mt-0.5 block text-[0.75rem] text-text-faint">
						{recall.reportedOn ? `${formatDate(fromDateInput(recall.reportedOn))} · ` : ''}Campaign{' '}
						{recall.campaign}
					</span>
				</span>
				<ChevronDown
					className="mt-1 size-4 shrink-0 text-text-faint transition-transform group-open:rotate-180"
					strokeWidth={1.75}
					aria-hidden
				/>
			</summary>
			<dl className="flex flex-col gap-3 border-t border-border px-4 pt-3 pb-4 text-[0.875rem]">
				{(
					[
						['What happened', recall.summary],
						['The risk', recall.consequence],
						['The fix', recall.remedy]
					] as const
				)
					.filter(([, text]) => text)
					.map(([label, text]) => (
						<div key={label}>
							<dt className="text-[0.75rem] tracking-[0.12em] text-text-faint uppercase">
								{label}
							</dt>
							<dd className="mt-1 text-text-muted">{text}</dd>
						</div>
					))}
			</dl>
		</details>
	);
}

export function Recalls({ vehicle }: { vehicle: Vehicle }) {
	const [showAll, setShowAll] = useState(false);
	const { data, isPending, isError } = useQuery({
		queryKey: keys.recalls(vehicle.id),
		queryFn: () => getRecalls(vehicle.id),
		staleTime: 60 * 60 * 1000
	});
	const model = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

	const vinCheck = vehicle.vin && (
		<a
			href={`https://www.nhtsa.gov/recalls?vin=${encodeURIComponent(vehicle.vin)}`}
			target="_blank"
			rel="noreferrer"
			className="mt-4 inline-flex items-center gap-1.5 text-[0.8125rem] text-accent-bright transition-opacity hover:opacity-80"
		>
			Look up this car’s VIN on nhtsa.gov
			<ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden />
		</a>
	);

	if (isPending) {
		return <p className="text-[0.875rem] text-text-muted">Checking NHTSA’s records…</p>;
	}

	if (isError) {
		return (
			<p className="text-[0.875rem] text-text-muted">
				NHTSA’s recall lookup didn’t answer. It’ll try again next time you open this car.
			</p>
		);
	}

	if (data.length === 0) {
		return (
			<EmptyState compact title="No recalls on file" line={`NHTSA lists none for the ${model}.`} />
		);
	}

	const shown = showAll ? data : data.slice(0, SHOWN);

	return (
		<>
			<p className="text-[0.8125rem] text-text-muted">
				{data.length} {data.length === 1 ? 'recall' : 'recalls'} on file for the {model}. Not every
				recall applies to every car.
			</p>
			<ul className="mt-4 flex flex-col gap-3">
				{shown.map((recall) => (
					<li key={recall.campaign}>
						<RecallItem recall={recall} />
					</li>
				))}
			</ul>
			{data.length > SHOWN && (
				<button
					type="button"
					onClick={() => setShowAll((open) => !open)}
					className="mt-3 text-[0.8125rem] text-text-muted transition-colors hover:text-text"
				>
					{showAll ? 'Show fewer' : `Show all ${data.length}`}
				</button>
			)}
			{vinCheck && <div>{vinCheck}</div>}
		</>
	);
}
