import { createContext, useContext, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useNavigationType, type Location } from 'react-router';

/**
 * The screens visited in this session, in the order the browser holds them.
 *
 * React Router knows the current location and nothing behind it, and a Back that
 * guesses ("Back to notes" from a note opened on the vehicle screen) strands the user
 * on a list they never came from. Mirroring the history stack is what lets Back say
 * where it goes, and lets a form leave by returning rather than by piling a duplicate
 * screen on top of the one it was opened from.
 *
 * A reload starts the stack afresh at the current screen: the browser's entries from
 * before it are still there, but nothing says what they were, so Back falls back to
 * the screen's parent instead.
 */
interface Visit {
	key: string;
	pathname: string;
}

interface History {
	visits: Visit[];
	navigate: ReturnType<typeof useNavigate>;
}

const HistoryContext = createContext<History | null>(null);

const visitOf = ({ key, pathname }: Location): Visit => ({ key, pathname });

function record(visits: Visit[], location: Location, type: ReturnType<typeof useNavigationType>) {
	if (type === 'PUSH') return [...visits, visitOf(location)];
	if (type === 'REPLACE') return [...visits.slice(0, -1), visitOf(location)];
	const at = visits.findIndex((visit) => visit.key === location.key);
	return at === -1 ? [...visits, visitOf(location)] : visits.slice(0, at + 1);
}

export function HistoryProvider({ children }: { children: ReactNode }) {
	const location = useLocation();
	const type = useNavigationType();
	const navigate = useNavigate();
	const [visits, setVisits] = useState<Visit[]>(() => [visitOf(location)]);

	// Derived during render, not in an effect, so the stack is never a screen behind.
	if (visits.at(-1)?.key !== location.key) setVisits(record(visits, location, type));

	return <HistoryContext.Provider value={{ visits, navigate }}>{children}</HistoryContext.Provider>;
}

function useHistory() {
	const history = useContext(HistoryContext);
	if (!history) throw new Error('useHistory needs a HistoryProvider above it');
	return history;
}

const NOT_NEW = '(?!new$)[^/]+';

const PLACES: [RegExp, string][] = [
	[/^\/vehicles$/, 'Vehicles'],
	[new RegExp(`^/vehicles/${NOT_NEW}$`), 'Vehicle'],
	[/^\/repairs$/, 'Repairs'],
	[new RegExp(`^/repairs/${NOT_NEW}$`), 'Repair'],
	[/^\/notes$/, 'Notes'],
	[new RegExp(`^/notes/${NOT_NEW}$`), 'Note'],
	[/^\/vendors$/, 'Vendors'],
	[/^\/users$/, 'Users'],
	[/^\/profile$/, 'Profile']
];

const placeOf = (pathname: string) => PLACES.find(([pattern]) => pattern.test(pathname))?.[1];

/** The screen Back returns to, if this session has one behind the current screen. */
export function usePrevious() {
	const { visits, navigate } = useHistory();
	const previous = visits.at(-2);

	return (
		previous && {
			pathname: previous.pathname,
			place: placeOf(previous.pathname),
			back: () => navigate(-1)
		}
	);
}

/**
 * Leave a form after it saves or deletes.
 *
 * When the screen behind is `to`, go back to it, so the form drops out of history and
 * Back from there goes where it went before the form opened. Otherwise replace the form
 * with `to`, for the same reason.
 *
 * `gone` is the path of what was just deleted. Its screens behind this one are skipped
 * and the first live one is returned to — deleting from a note's edit form lands on the
 * vehicle the note was opened from, not on the deleted note's "not found".
 */
export function useLeave() {
	const { visits, navigate } = useHistory();
	const behind = visits.slice(0, -1).reverse();

	return (to: string, gone?: string) => {
		const steps = gone ? behind.findIndex((visit) => !visit.pathname.startsWith(gone)) : 0;
		const target = behind[steps];

		if (target && (gone || target.pathname === to)) navigate(-(steps + 1));
		else navigate(to, { replace: true });
	};
}
