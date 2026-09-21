# Frunk API

The REST surface the applet talks to. Every route is an Astro `APIRoute` under
`src/pages/api/`, all bundled into a single Vercel function.

**The auth boundary is here, not on the page.** Astro serves identical static HTML to
everyone; each handler resolves the session cookie itself and answers 401 when there
isn't one. There is no `hooks.server.ts` equivalent and no per-page guard.

## Conventions

|              |                                                                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Request body | JSON. `content-type: application/json` on every write.                                                                                       |
| Auth         | Better Auth's session cookie, or `Authorization: Bearer <token>` from the mobile shells (the `bearer` plugin). Seven days, refreshed on use. |
| Errors       | `{ "error": string }`, plus `{ "fields": { path: string[] } }` on a 422.                                                                     |
| PATCH        | Genuinely partial. An omitted key is left alone; an explicit `null` clears a nullable column.                                                |
| Dates        | ISO 8601 strings in and out.                                                                                                                 |
| Ownership    | Enforced by a `user_id` predicate inside the query, so someone else's row is a 404, never a 403.                                             |

### Status codes

`200` ok · `201` created · `204` deleted / signed out · `400` malformed JSON or query ·
`401` no session · `403` signed in but not allowed · `404` missing or not yours ·
`422` validation failed · `500` unexpected

### CSRF

Astro's origin check is left on. Browsers send `Origin` on every non-GET `fetch`, so the
applet is unaffected, but **curl must send it by hand** or mutating calls get a 403:

```bash
curl -X DELETE -H 'Origin: https://frunk.cloud' https://frunk.cloud/api/vehicles/$ID
```

The session cookie is additionally `SameSite=Lax`, so it is not attached to cross-site
requests in the first place.

## Routes

### Auth

**Better Auth** (Decision 2), mounted whole at `/api/auth/*` from `src/pages/api/auth/[...all].ts`
and configured in `src/lib/server/auth/config.ts`: email + password, passkeys, TOTP and
anonymous accounts. The table lists what frunk actually calls; the rest of the plugins'
surface (passkey listing and deletion, password and email change, account deletion,
backup codes) is mounted but not in the UI yet.

| Method | Path                                              | Notes                                                                                                                                                                                                                                                    |
| ------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/auth/get-session`                           | `{ session, user }` or `null`. **200 either way** — the nav island subscribes to this, and signed-out is not an error.                                                                                                                                   |
| `POST` | `/api/auth/sign-up/email`                         | `{ email, password, name }` → 200 `{ token: null, user }`. Sends the verification mail in the background; no session opens until the link is clicked. **409** from a demo session (see Demo). An address already taken answers 200 and creates nothing.  |
| `POST` | `/api/auth/sign-in/email`                         | `{ email, password }` → 200 `{ token, user }` and the cookie. 401 for a wrong password and an unknown address alike; 403 while the address is unverified. With recovery enrolled: 200 `{ twoFactorRedirect: true }` plus a challenge cookie — see below. |
| `POST` | `/api/auth/send-verification-email`               | `{ email, callbackURL }` → 200 regardless of whether the address exists.                                                                                                                                                                                 |
| `GET`  | `/api/auth/verify-email?token=&callbackURL=`      | Marks the address verified and redirects.                                                                                                                                                                                                                |
| `POST` | `/api/auth/sign-out`                              | 200 `{ success: true }`. Idempotent.                                                                                                                                                                                                                     |
| `POST` | `/api/auth/update-user`                           | `{ name?, image? }`. The profile uses this rather than `PATCH /api/users/:id` because it refreshes the client's session store.                                                                                                                           |
| `GET`  | `/api/auth/passkey/generate-register-options`     | Signed in. Creation options; the challenge is stored server-side and consumed on verify.                                                                                                                                                                 |
| `POST` | `/api/auth/passkey/verify-registration`           | `{ response, name? }`. Adds the credential. **On a demo account this is the conversion**: an `after` hook flips `roles` DEMO→USER and clears `isAnonymous`.                                                                                              |
| `GET`  | `/api/auth/passkey/generate-authenticate-options` | No email: the browser offers the discoverable credentials it holds for this origin.                                                                                                                                                                      |
| `POST` | `/api/auth/passkey/verify-authentication`         | `{ response }` → session. A replayed body is refused (asserted by the passkey journey).                                                                                                                                                                  |
| `POST` | `/api/auth/two-factor/enable`                     | Signed in, `{ password }` → `{ totpURI, backupCodes }`. Nothing is enforced until the first `verify-totp` confirms the secret.                                                                                                                           |
| `POST` | `/api/auth/two-factor/verify-totp`                | `{ code, trustDevice? }`. With a session: confirms enrolment. With the challenge cookie from sign-in: opens the session. Ten consecutive failures lock the account for fifteen minutes.                                                                  |
| `POST` | `/api/auth/two-factor/disable`                    | Signed in, `{ password }`.                                                                                                                                                                                                                               |

**The relying party is derived per request** unless `RP_ID` / `RP_ORIGIN` pin it (see
Environment). A wrong one does not fail loudly — it mints passkeys that can never sign in.

**TOTP is recovery in intent and a second factor in mechanism.** Better Auth's plugin
does not know the difference: once a code is enrolled, every password sign-in answers
`{ twoFactorRedirect: true }` with a signed challenge cookie, and the session opens only
when `verify-totp` accepts a code against that cookie. `trustDevice: true` exempts the
browser for thirty days. A passkey sign-in is never challenged — the passkey _is_ the
strong factor, which is the whole reason the code exists. So the way back after losing a
device is: email + password, then the code.

**Rate limits.** Better Auth's own limiter is on in production (in memory, per instance —
which on serverless is only a partial guard), and the two-factor plugin keeps its attempt
and lockout counters in Postgres. frunk's Postgres limiter (`auth_rate_limits`) covers
the two endpoints outside Better Auth that a stranger can hit: `POST /api/demo` (3 an
hour per address) and `POST /api/contact` (5 an hour). A 429 carries `Retry-After`.

**Anti-enumeration is Better Auth's default.** Sign-in cannot tell a caller whether an
address exists, and neither can sign-up. Stricter than the deliberate 404 the hand-rolled
API used to give — and the reason sign-up ends at "Check your email" with a resend button
rather than a promise: a returning user who signs up again gets the same screen and no
mail.

### Demo

| Method | Path        | Notes                                                                                                                                                                                                                                                          |
| ------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/demo` | 200 with a new account and a session (Better Auth's own sign-in response, so `roles` in that body is still `[]` — the DEMO role and the garage are applied right after). 200 with the _same_ account if one is already in progress; 409 if signed in for real. |

A demo visitor is not in a mode — they hold a real account cloned from
`creed.bratton@dundermifflin.com`, isolated by `user_id` like anyone else, so no endpoint
above needs a `demo` flag. Requires `pnpm db:seed-office`; without the template the
endpoint answers 503 rather than failing opaquely.

**Converting is a passkey, never an email.** `POST /api/auth/sign-up/email` answers
**409** while the request carries a demo session: Better Auth's sign-up always mints a
second account, so the garage could only be left behind. And no auth ceremony deletes a
demo account — Better Auth's anonymous plugin would, by default, on the next sign-in from
that browser (`disableDeleteAnonymousUser` is set). Retiring a demo is the reaper's job
alone. `tests/demo-conversion.test.ts` asserts both in Postgres.

### Vehicles

| Method   | Path                | Notes                                                                                                               |
| -------- | ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/vehicles`     | The caller's vehicles, newest first.                                                                                |
| `POST`   | `/api/vehicles`     | `make`, `model`, `year` required; all 46 optional columns accepted.                                                 |
| `GET`    | `/api/vehicles/:id` | The whole detail screen: `{ vehicle, notes, repairs, vendors, galleries, schedules }`, galleries with their photos. |
| `PATCH`  | `/api/vehicles/:id` |                                                                                                                     |
| `DELETE` | `/api/vehicles/:id` | Notes, repairs, galleries and schedules cascade.                                                                    |

### Vendors

| Method   | Path               | Notes                                         |
| -------- | ------------------ | --------------------------------------------- |
| `GET`    | `/api/vendors`     |                                               |
| `POST`   | `/api/vendors`     | `name` required.                              |
| `GET`    | `/api/vendors/:id` | `{ vendor, notes, repairs }`.                 |
| `PATCH`  | `/api/vendors/:id` |                                               |
| `DELETE` | `/api/vendors/:id` | Repairs survive; their `vendor_id` goes null. |

### Repairs

| Method   | Path               | Notes                                                                          |
| -------- | ------------------ | ------------------------------------------------------------------------------ |
| `GET`    | `/api/repairs`     | Across every vehicle the caller owns, with vendor and vehicle names joined in. |
| `POST`   | `/api/repairs`     | `vehicleId`, `description`, `date`. A `vendorId` must also be the caller's.    |
| `GET`    | `/api/repairs/:id` | `{ repair, notes }`.                                                           |
| `PATCH`  | `/api/repairs/:id` |                                                                                |
| `DELETE` | `/api/repairs/:id` |                                                                                |

### Notes

Notes attach to a vehicle, repair, vendor or parent note, and nest one level.

| Method   | Path               | Notes                                                                              |
| -------- | ------------------ | ---------------------------------------------------------------------------------- |
| `GET`    | `/api/notes`       | Every note on the caller's vehicles.                                               |
| `POST`   | `/api/notes`       | `title` plus at least one parent id.                                               |
| `GET`    | `/api/notes/:uuid` | `{ note, children }`.                                                              |
| `PATCH`  | `/api/notes/:uuid` |                                                                                    |
| `DELETE` | `/api/notes/:uuid` | Deletes children too — `parent_note_id` has no FK, so the database will not do it. |

### Galleries and photos

| Method   | Path                 | Notes                                                                                               |
| -------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/galleries`     | `vehicleId`, `name`.                                                                                |
| `GET`    | `/api/galleries/:id` | Gallery with its photos in display order.                                                           |
| `PATCH`  | `/api/galleries/:id` | `photoOrder: string[]` rewrites `order` from the array index. Ids outside this gallery are ignored. |
| `DELETE` | `/api/galleries/:id` | Photo rows cascade.                                                                                 |
| `POST`   | `/api/photos`        | `galleryId`, `imageUrl`.                                                                            |
| `PATCH`  | `/api/photos/:id`    |                                                                                                     |
| `DELETE` | `/api/photos/:id`    |                                                                                                     |

A photo is two requests: the upload (below) answers with a serving URL, and `POST
/api/photos` hangs that URL on the gallery. Deleting a photo, a gallery, a vehicle or an
account removes the blobs with the rows.

### Maintenance schedules

| Method   | Path                             | Notes                                                                          |
| -------- | -------------------------------- | ------------------------------------------------------------------------------ |
| `POST`   | `/api/maintenance-schedules`     | `vehicleId`, `name`, and at least one of `intervalMiles` / `intervalMonths`.   |
| `PATCH`  | `/api/maintenance-schedules/:id` | Marking one done is this, with `lastCompletedDate` and `lastCompletedMileage`. |
| `DELETE` | `/api/maintenance-schedules/:id` |                                                                                |

### Files

| Method   | Path                          | Notes                                                                                                                                                                |
| -------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/uploads?filename=x.pdf` | The raw file as the body, `content-type` set. JPG, PNG, WebP, GIF, AVIF or PDF, up to 10 MB. **201** `{ url, pathname }`; 415 wrong type, 413 too big, 503 no store. |
| `DELETE` | `/api/uploads?url=…`          | Removes one of the caller's own files. Exists for the avatar, whose column Better Auth writes; every other route cleans its own blobs.                               |
| `GET`    | `/api/files/u/:userId/…`      | The file, `private, immutable` cache headers. Only to its owner: anyone else's file is a 404, not a 403.                                                             |

`url` is what the database stores — the app-relative serving path, never a blob URL — so
`<img src>` works unchanged and the store could be swapped without a data migration. The
`u/<userId>/` prefix is the ownership boundary, and user ids survive demo→real conversion,
so it is stable for the life of the account. The store is **private**; the legacy R2 bucket
served every document from a public URL.

An upload abandoned before its form is saved leaves an orphan blob. Accepted, and recorded
in the plan.

### Users

| Method   | Path               | Notes                                                                                     |
| -------- | ------------------ | ----------------------------------------------------------------------------------------- |
| `GET`    | `/api/users`       | **Admin only.** `?page=&pageSize=&sortBy=id\|username\|roles&sortOrder=asc\|desc&search=` |
| `GET`    | `/api/users/:uuid` | Own profile, or anyone's for an admin.                                                    |
| `PATCH`  | `/api/users/:uuid` | Own profile, or anyone's for an admin. **Only an admin may set `roles`.**                 |
| `DELETE` | `/api/users/:uuid` | Own account (ends the session) or, for an admin, anyone's. Uploads go with it.            |

### Contact

| Method | Path           | Notes                                                                                                                            |
| ------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/contact` | `name`, `email`, `message`. **202** `{ sent: true }` once Resend accepts it. Unauthenticated, so rate limited: 5 an hour per IP. |

### Cron

| Method | Path                   | Notes                                                                                                                                                                                                                         |
| ------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/cron/reap-demos` | **Vercel cron only** — `Authorization: Bearer <CRON_SECRET>`; 401 otherwise, 503 with no secret configured. Deletes demo accounts older than 7 days that never attached a passkey, uploads included. Answers `{ reaped: n }`. |

Scheduled daily at 04:00 UTC in `vercel.json`. Crons run against the production deployment
only, so `CRON_SECRET` is a production variable. `vercel crons run /api/cron/reap-demos`
fires it by hand; the predicate lives in `src/lib/server/reaper.ts`.

## Verifying against a deploy

```bash
BASE=https://your-preview.vercel.app

# 200 with a null user — no session needed
curl -s $BASE/api/auth/me

# 401 on everything else
curl -s -o /dev/null -w '%{http_code}\n' $BASE/api/vehicles
```

Signed-in calls need a session, and a passkey ceremony cannot be curled — it needs a
real authenticator. The demo endpoint is the way to get one from a terminal:

```bash
# 200, and the session cookie comes back in Set-Cookie
curl -s -c jar.txt -X POST -H "Origin: $BASE" $BASE/api/demo

curl -s -b jar.txt -H "Origin: $BASE" $BASE/api/vehicles
```

That needs `pnpm db:seed-office` to have run on that database. For a real account, sign in
with a password instead — the cookie is the same kind:

```bash
curl -s -c jar.txt -X POST -H "Origin: $BASE" -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"…"}' $BASE/api/auth/sign-in/email
```

Sessions cannot be inserted by hand any more: Better Auth owns the `session` table and
signs its cookie with `BETTER_AUTH_SECRET`.

## Database setup

Three ways, in order of how little you need to hand:

**1. One paste — no tooling.** Open `drizzle/bootstrap.sql`, copy it, and run it in the
Neon SQL Editor (console.neon.tech → your project → SQL Editor). It is the schema plus the
three role rows, with every statement guarded so a second run is a no-op. This works from a
phone.

**2. A button.** The `Database migrate` GitHub Action (`.github/workflows/db-migrate.yml`)
has three actions: `status` prints the host, database, tables, roles and whether the demo
template exists; `push` applies the schema and seeds the roles; `seed-office` also loads
the sample garage. Actions tab → Run workflow. Works from a phone, and the connection
string never leaves GitHub Secrets.

- It reads **`ASTRO_DATABASE_URL`** from the `database` environment — the production
  branch's string, which is Sensitive on Vercel and so reachable from nowhere else. The
  nightly `db-backup.yml` reads the same secret, so one place knows where production is.
- A write requires typing the database name (`status` prints it), so it cannot fire by
  accident, and it never runs on a git push: a migration should not be a side effect of a
  deploy. It also refuses a ref without `astro.config.mjs`.

**3. A terminal.**

```bash
pnpm db:generate       # regenerate drizzle/*.sql after a schema change
pnpm db:bootstrap-sql  # then regenerate drizzle/bootstrap.sql from it
pnpm db:push           # apply the schema to DATABASE_URL
pnpm db:seed-roles     # ROLE_IDS in src/lib/roles.ts hardcodes ids 1/2/3
pnpm db:seed-office    # sample data, and the template POST /api/demo clones
```

Both seed scripts print the database they are about to write to before they touch it.

## Environment

All of it goes in a gitignored `.env` at the repo root. Only `DATABASE_URL` is required.
The schema is declared in `astro.config.mjs`; this table mirrors it.

|                         |                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Required. Points at the **new, blank** Neon database, not the legacy one.           |
| `BETTER_AUTH_SECRET`    | Signs sessions and encrypts TOTP secrets at rest. **Never rotate** — see CLAUDE.md. |
| `RP_ID`                 | The WebAuthn relying-party id — `frunk.cloud` in production.                        |
| `RP_ORIGIN`             | `https://frunk.cloud`.                                                              |
| `RESEND_API_KEY`        | Transactional email. Without it `sendEmail` fails at call time, not at build.       |
| `CONTACT_EMAIL`         | Where the contact form lands. Defaults to the footer address.                       |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (`frunk-uploads`, private). Without it uploads answer 503.              |
| `CRON_SECRET`           | What Vercel's cron presents to `/api/cron/*`. Production only; unset answers 503.   |

**`RP_ID` and `RP_ORIGIN` are optional, and unset is the right answer in development
and on preview deploys.** Left blank they are derived from the request, which is the only
thing that covers Vercel's per-deploy preview hostnames — every preview is a different
subdomain, so nothing static could. Pin both in production: a passkey is bound to its
relying-party id, and an authoritative value cannot be influenced by a request at all.

Getting them wrong does not fail loudly. It silently creates passkeys that can never
sign in, because the browser will not release a credential to an origin that does not
match the id it was minted for.

```
DATABASE_URL=postgresql://...
```

The app reads it through `astro:env/server`, **not** `process.env`. This matters: Astro
loads `.env` into its own env layer and never copies it into `process.env`, so reading
`process.env.DATABASE_URL` gives `undefined` in dev even with a perfectly good `.env` —
while `drizzle.config.ts`, which imports `dotenv/config` itself, sees it fine. One
misconfiguration, two different symptoms.

If it is missing, every `/api/*` route fails with Astro's `EnvInvalidVariables` naming the
variable. Static pages are unaffected — `/` renders without a database.

## Running against a local Postgres

`DATABASE_URL` picks the driver by hostname: anything ending in `.neon.tech` uses Neon's
HTTP protocol, anything else uses node-postgres over TCP. So the whole API runs against a
throwaway local database with no Neon account:

```bash
createdb frunk_dev
psql frunk_dev -f drizzle/bootstrap.sql
DATABASE_URL=postgresql://localhost/frunk_dev pnpm db:seed-office
DATABASE_URL=postgresql://localhost/frunk_dev pnpm dev
```

Passing it on the command line rather than writing `.env` is deliberate: `process.env`
wins over `.env` in both Astro and the seed scripts, so a one-off local run cannot be
confused with whatever the file points at. Passkeys work on `localhost` without further
configuration — it counts as a secure context.

No `createdb` on macOS? It ships with the Postgres client tools, not with the OS:
`brew install postgresql@17 && brew services start postgresql@17`, then add
`/opt/homebrew/opt/postgresql@17/bin` to `PATH`. Or install Postgres.app. Either way this
is optional — pointing `DATABASE_URL` at the Neon database works the same.
