import { NhtsaUnavailable } from '../../../lib/server/nhtsa';
import { fail, HttpError } from './http';

/** An NHTSA call whose outage is a 502 naming the lookup, not a generic 500. */
export async function fromNhtsa<T>(lookup: string, load: () => Promise<T>): Promise<T> {
	try {
		return await load();
	} catch (cause) {
		if (!(cause instanceof NhtsaUnavailable)) throw cause;
		console.error(cause.message);
		throw new HttpError(fail(502, `The ${lookup} is not answering right now`));
	}
}
