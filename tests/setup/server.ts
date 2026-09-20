/**
 * Where the suite points.
 *
 * `tests/run.sh` starts the server, resets the database and exports `TEST_BASE`. The
 * default is only for running Vitest directly against a server you started yourself.
 */
export const BASE = process.env.TEST_BASE ?? 'http://localhost:4455';
