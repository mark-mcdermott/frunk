import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from './AppShell';
import { NoteFormPage } from './routes/NoteFormPage';
import { NotesPage } from './routes/NotesPage';
import { RepairFormPage } from './routes/RepairFormPage';
import { RepairsPage } from './routes/RepairsPage';
import { VehicleDetailPage } from './routes/VehicleDetailPage';
import { VehicleFormPage } from './routes/VehicleFormPage';
import { VehiclesPage } from './routes/VehiclesPage';
import { VendorFormPage } from './routes/VendorFormPage';
import { VendorsPage } from './routes/VendorsPage';

/**
 * The applet: one `client:only` island holding the whole signed-in app (Phase 4).
 *
 * **Why the header lives in here rather than in Astro.** The app header carries the
 * violet active-nav dot, which depends on the current route; a contextual primary
 * action; and the avatar. All three want state the router owns. Putting the header
 * outside the island would mean plumbing each across the boundary — so the island
 * starts at the shell, not at the page body (DESIGN.md §4).
 *
 * **One QueryClient, created once.** Constructing it inside the component body would
 * hand every render a fresh cache, which looks like "the data keeps refetching" and is
 * a genuinely confusing bug to chase. There is exactly one island, so a module-level
 * client is also the only cache in the page.
 */
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			/*
			 * Vehicle data changes when *you* change it, not on its own. A minute of
			 * staleness means moving between screens is instant instead of re-fetching
			 * what was just shown — the thing Decision 9 exists to buy.
			 */
			staleTime: 60_000,
			retry: 1,
			refetchOnWindowFocus: false
		}
	}
});

export function AppRoot() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<AppShell>
					<Routes>
						<Route path="/vehicles" element={<VehiclesPage />} />
						{/* Static before dynamic, so `new` is never read as an id. */}
						<Route path="/vehicles/new" element={<VehicleFormPage />} />
						<Route path="/vehicles/:id" element={<VehicleDetailPage />} />
						<Route path="/vehicles/:id/edit" element={<VehicleFormPage />} />
						<Route path="/repairs" element={<RepairsPage />} />
						<Route path="/repairs/new" element={<RepairFormPage />} />
						<Route path="/repairs/:id/edit" element={<RepairFormPage />} />
						<Route path="/notes" element={<NotesPage />} />
						<Route path="/notes/new" element={<NoteFormPage />} />
						<Route path="/notes/:uuid/edit" element={<NoteFormPage />} />
						<Route path="/vendors" element={<VendorsPage />} />
						<Route path="/vendors/new" element={<VendorFormPage />} />
						<Route path="/vendors/:id/edit" element={<VendorFormPage />} />
						{/* Unknown app paths go to the garage rather than a blank island. */}
						<Route path="*" element={<Navigate to="/vehicles" replace />} />
					</Routes>
				</AppShell>
			</BrowserRouter>
		</QueryClientProvider>
	);
}
