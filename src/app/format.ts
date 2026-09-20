/**
 * Display and form conversions, in one place.
 *
 * Money and dates are the two things the API and the UI disagree about: costs are
 * stored in **cents** as integers, and timestamps cross the wire as **ISO strings**
 * while `<input type="date">` speaks `YYYY-MM-DD`. Every conversion lives here so a
 * screen never does the arithmetic inline and get it subtly wrong.
 */

/** "Sep 19, 2026" — the list screens. */
export const formatDate = (iso: string) =>
	new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** "9/19/2026" — the compact stacks on the vehicle detail panels. */
export const formatNumericDate = (iso: string) =>
	new Date(iso).toLocaleDateString(undefined, {
		month: 'numeric',
		day: 'numeric',
		year: 'numeric'
	});

export const formatTime = (iso: string) =>
	new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export const formatCost = (cents: number) =>
	(cents / 100).toLocaleString(undefined, {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2
	});

export const formatMiles = (miles: number) => `${miles.toLocaleString()} mi`;

/**
 * ISO → `YYYY-MM-DD` for a date input, read in **local** time.
 *
 * `toISOString().slice(0, 10)` is the tempting one-liner and it is wrong: it converts to
 * UTC first, so an evening timestamp west of Greenwich shows the next day's date.
 */
export function toDateInput(iso: string) {
	const date = new Date(iso);
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * `YYYY-MM-DD` → ISO with an offset, which is what `schemas.ts` requires.
 *
 * Parsed at local midnight rather than passing the bare date to `new Date()`, which
 * would read it as UTC midnight and shift it a day backwards in western timezones.
 */
export const fromDateInput = (value: string) => new Date(`${value}T00:00:00`).toISOString();

/** Dollars typed in a form → the integer cents the column stores. */
export const toCents = (dollars: string) => Math.round(Number(dollars) * 100);

/** Cents → the plain decimal a money input should show; no currency symbol. */
export const fromCents = (cents: number) => (cents / 100).toFixed(2);
