import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Car, FileText, Paperclip, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { deleteNote, keys, listNotes, type NoteRow } from '../api';
import {
	FilterChips,
	IconButton,
	ListCard,
	ListRow,
	ListState,
	SearchInput,
	type Filter
} from '../components/List';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../format';

/**
 * Every note across every vehicle, built to `docs/mocks/notes-index.webp`.
 *
 * `GET /api/notes` joins the owning vehicle in and returns only notes attached to a
 * vehicle — a note on a repair or vendor does not appear here, which matches what the
 * endpoint does rather than implying a completeness it does not have.
 *
 * Like the repairs index, the mock's pagination is not built: the endpoint has no
 * cursor, so paging would be decoration over a full result set.
 */

type FilterKey = 'all' | 'with-attachment' | 'no-attachment';

function NoteRowItem({ note, onDelete }: { note: NoteRow; onDelete: () => void }) {
	const navigate = useNavigate();
	const { vehicleYear, vehicleMake, vehicleModel } = note.vehicle;

	return (
		<ListRow
			icon={<FileText className="size-5" strokeWidth={1.5} />}
			aside={
				<p className="flex shrink-0 items-center gap-1.5 text-[0.8125rem] text-text-muted">
					<Calendar className="size-3.5" strokeWidth={1.75} aria-hidden />
					{formatDate(note.createdAt)}
				</p>
			}
			actions={
				<>
					<IconButton
						label={`Edit ${note.title}`}
						onClick={() => navigate(`/notes/${note.uuid}/edit`)}
					>
						<Pencil className="size-4" strokeWidth={1.75} aria-hidden />
					</IconButton>
					<IconButton label={`Delete ${note.title}`} tone="destructive" onClick={onDelete}>
						<Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
					</IconButton>
				</>
			}
		>
			<h2 className="display-sm text-lg sm:truncate">
				<Link to={`/notes/${note.uuid}`} className="transition-opacity hover:opacity-80">
					{note.title}
				</Link>
			</h2>

			{note.body && <p className="mt-1 truncate text-[0.875rem] text-text-muted">{note.body}</p>}

			<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-text-muted">
				{note.vehicleId && (
					<Link
						to={`/vehicles/${note.vehicleId}`}
						className="flex items-center gap-1.5 hover:text-text"
					>
						<Car className="size-3.5" strokeWidth={1.75} aria-hidden />
						{vehicleYear} {vehicleMake} {vehicleModel}
					</Link>
				)}
				{note.imageUrl && (
					<span className="flex items-center gap-1.5">
						<Paperclip className="size-3.5" strokeWidth={1.75} aria-hidden />
						Has attachment
					</span>
				)}
			</div>
		</ListRow>
	);
}

export function NotesPage() {
	const client = useQueryClient();
	const [search, setSearch] = useState('');
	const [filter, setFilter] = useState<FilterKey>('all');

	const {
		data: notes,
		isPending,
		isError,
		error
	} = useQuery({
		queryKey: keys.notes,
		queryFn: listNotes
	});

	const remove = useMutation({
		mutationFn: deleteNote,
		onSuccess: () => {
			client.invalidateQueries({ queryKey: keys.notes });
			// A note also appears on its vehicle's detail screen.
			client.invalidateQueries({ queryKey: keys.vehicles });
		}
	});

	const all = notes ?? [];

	const filters: Filter<FilterKey>[] = [
		{ key: 'all', label: 'All', count: all.length },
		{
			key: 'with-attachment',
			label: 'With attachments',
			count: all.filter((n) => n.imageUrl).length
		},
		{
			key: 'no-attachment',
			label: 'No attachments',
			count: all.filter((n) => !n.imageUrl).length
		}
	];

	const term = search.trim().toLowerCase();
	const visible = all
		.filter((note) =>
			filter === 'all'
				? true
				: filter === 'with-attachment'
					? Boolean(note.imageUrl)
					: !note.imageUrl
		)
		.filter((note) => {
			if (!term) return true;
			const { vehicleYear, vehicleMake, vehicleModel } = note.vehicle;
			return `${note.title} ${note.body ?? ''} ${vehicleYear} ${vehicleMake} ${vehicleModel}`
				.toLowerCase()
				.includes(term);
		});

	return (
		<>
			<div className="flex flex-wrap items-start justify-between gap-6">
				<div>
					<h1 className="display text-[clamp(2rem,4vw,2.75rem)]">All Notes</h1>
					<p className="mt-3 text-[0.9375rem] text-text-muted">All notes across your vehicles.</p>
				</div>

				<Link to="/notes/new" className="btn-primary">
					<Plus className="size-4" strokeWidth={2} aria-hidden />
					Add Note
				</Link>
			</div>

			<div className="mt-8 flex flex-wrap items-center justify-between gap-4">
				<FilterChips
					label="Filter notes by attachment"
					filters={filters}
					active={filter}
					onChange={setFilter}
				/>
				<SearchInput
					id="note-search"
					label="Search notes"
					value={search}
					onChange={setSearch}
					placeholder="Search notes…"
				/>
			</div>

			<ListCard>
				{isPending || isError ? (
					<ListState pending={isPending} error={error} noun="notes" />
				) : visible.length === 0 ? (
					<EmptyState
						icon={<FileText className="size-5" strokeWidth={1.5} />}
						title={all.length === 0 ? 'No notes yet' : 'Nothing matches that'}
						line={
							all.length === 0
								? 'Receipts, known issues and anything else worth remembering.'
								: 'Try a different title, body or vehicle.'
						}
					/>
				) : (
					visible.map((note) => (
						<NoteRowItem key={note.uuid} note={note} onDelete={() => remove.mutate(note.uuid)} />
					))
				)}
			</ListCard>
		</>
	);
}
