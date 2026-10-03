import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { describeInterval, suggestedSchedules } from '@/lib/maintenance';
import { createSchedule, keys, updateSchedule } from '../api';
import { formatMiles } from '../format';

/**
 * A starter plan for a vehicle with no schedules, in place of an empty panel.
 *
 * Picking from twelve templates one at a time was the friction (dogfooding, 2026-10-02):
 * a new car's owner rarely knows what to schedule, and almost never when each thing was
 * last done. So the common services for the car's fuel come pre-ticked, one tap adds
 * them all, and "count from today" sets each one's baseline to today's date and
 * odometer, which is what turns a "Not started" schedule into a reminder. The baseline
 * is the owner's explicit choice and written as one; no repair is logged for it, since
 * nothing was done.
 */
export function ScheduleSuggestions({
	vehicleId,
	currentMileage,
	fuelType,
	onDismiss
}: {
	vehicleId: string;
	currentMileage: number | null;
	fuelType: string | null;
	onDismiss: () => void;
}) {
	const client = useQueryClient();
	const suggestions = suggestedSchedules(fuelType);
	const [picked, setPicked] = useState(() => new Set(suggestions.map((s) => s.name)));
	const [countFromToday, setCountFromToday] = useState(currentMileage != null);

	const chosen = suggestions.filter((s) => picked.has(s.name));

	const add = useMutation({
		mutationFn: () => {
			const today = new Date().toISOString();
			const baseline = countFromToday && currentMileage != null;
			return Promise.all(
				chosen.map(async (template) => {
					const schedule = await createSchedule({ vehicleId, ...template });
					if (baseline) {
						await updateSchedule(schedule.id, {
							...template,
							lastCompletedDate: today,
							lastCompletedMileage: currentMileage
						});
					}
				})
			);
		},
		// Partial success still added rows, so the panel refreshes either way.
		onSettled: () => client.invalidateQueries({ queryKey: keys.vehicle(vehicleId) })
	});

	const toggle = (name: string) =>
		setPicked((current) => {
			const next = new Set(current);
			if (next.has(name)) next.delete(name);
			else next.add(name);
			return next;
		});

	return (
		<div>
			<h3 className="heading text-[0.9375rem]">Suggested for this car</h3>
			<p className="mt-1 text-[0.8125rem] text-text-muted">
				The usual services and intervals. Untick what doesn’t apply.
			</p>

			<ul className="mt-4 flex flex-col">
				{suggestions.map((template) => (
					<li key={template.name}>
						<label className="flex cursor-pointer items-start gap-3 rounded-control py-2 text-[0.9375rem] text-text">
							<input
								type="checkbox"
								checked={picked.has(template.name)}
								onChange={() => toggle(template.name)}
								className="mt-1 size-4 shrink-0 rounded accent-accent"
							/>
							<span className="min-w-0">
								{template.name}
								<span className="block text-[0.8125rem] text-text-faint">
									{describeInterval(template)}
								</span>
							</span>
						</label>
					</li>
				))}
			</ul>

			<div className="mt-4 border-t border-border pt-4">
				{currentMileage != null ? (
					<label className="flex cursor-pointer items-start gap-3 text-[0.9375rem] text-text">
						<input
							type="checkbox"
							checked={countFromToday}
							onChange={(event) => setCountFromToday(event.target.checked)}
							className="mt-1 size-4 shrink-0 rounded accent-accent"
						/>
						<span>
							Count from today at {formatMiles(currentMileage)}
							<span className="mt-0.5 block text-[0.8125rem] text-text-muted">
								For when you don’t know when they were last done. The first reminders come one
								interval from now; mark any done with its real date whenever you know it.
							</span>
						</span>
					</label>
				) : (
					<p className="text-[0.8125rem] text-text-muted">
						<Link to={`/vehicles/${vehicleId}/edit#currentMileage`} className="text-accent-bright">
							Add the mileage
						</Link>{' '}
						first and these can start counting from today. Otherwise each waits for its first “mark
						done”.
					</p>
				)}
			</div>

			{add.isError && (
				<p role="alert" className="mt-4 text-[0.875rem] text-destructive">
					{add.error instanceof Error ? add.error.message : 'Could not add those schedules.'}
				</p>
			)}

			<div className="mt-5 flex flex-wrap items-center gap-3">
				<button
					type="button"
					onClick={() => add.mutate()}
					disabled={chosen.length === 0 || add.isPending}
					className="btn-primary disabled:opacity-60"
				>
					{add.isPending
						? 'Adding…'
						: `Add ${chosen.length} ${chosen.length === 1 ? 'schedule' : 'schedules'}`}
				</button>
				<button
					type="button"
					onClick={onDismiss}
					className="text-[0.875rem] text-text-muted transition-colors hover:text-text"
				>
					I’ll set them up myself
				</button>
			</div>
		</div>
	);
}
