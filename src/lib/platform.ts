/**
 * Which build this is.
 *
 * The same applet ships two ways. On the web it is an island on frunk.cloud: same
 * origin as the API, a session cookie, relative URLs everywhere. In the native apps it
 * is a static bundle (`pnpm build:native`) running from `capacitor://localhost`: the API
 * is another origin, the session is a bearer token, and anything the API serves needs
 * that token to be fetched. Code that has to know the difference asks here, so the
 * difference stays in a handful of places — `api.ts`, `auth-client.ts`, `files.tsx` and
 * the shell — instead of leaking into every screen.
 *
 * Both values are baked in at build time from `.env.native`; an Astro build has
 * neither, which is what makes the web the default.
 */
export const NATIVE: boolean = import.meta.env.PUBLIC_NATIVE === '1';

/** Empty on the web. The native bundle carries the deployed origin. */
export const API_BASE: string = import.meta.env.PUBLIC_API_BASE ?? '';

export const apiUrl = (path: string) => `${API_BASE}${path}`;
