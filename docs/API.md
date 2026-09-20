# Frunk API

The REST surface the applet talks to. Every route is an Astro `APIRoute` under
`src/pages/api/`, all bundled into a single Vercel function.

**The auth boundary is here, not on the page.** Astro serves identical static HTML to
everyone; each handler resolves the session cookie itself and answers 401 when there
isn't one. There is no `hooks.server.ts` equivalent and no per-page guard.

## Conventions

|              |                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Request body | JSON. `content-type: application/json` on every write.                                             |
| Auth         | `auth-session` cookie — opaque token, SHA-256 of it keys the `session` row, 30-day sliding expiry. |
| Errors       | `{ "error": string }`, plus `{ "fields": { path: string[] } }` on a 422.                           |
| PATCH        | Genuinely partial. An omitted key is left alone; an explicit `null` clears a nullable column.      |
| Dates        | ISO 8601 strings in and out.                                                                       |
| Ownership    | Enforced by a `user_id` predicate inside the query, so someone else's row is a 404, never a 403.   |

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

Passkeys are the only factor (Decision 2). There is no password anywhere, and no
password-reset email — TOTP is the recovery path instead.

Each ceremony is two calls: `options` issues a challenge, `verify` checks the
signature over it and opens a session. The challenge is stored server-side in
`webauthn_challenges` and **consumed on read**, so a spent one cannot be replayed.

| Method | Path                         | Notes                                                                                                               |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/auth/me`               | `{ user }` or `{ user: null }`. **200 either way** — the nav island reads this, and signed-out is not an error.     |
| `POST` | `/api/auth/register/options` | `{ email }` → `PublicKeyCredentialCreationOptionsJSON`. 409 if the email is taken.                                  |
| `POST` | `/api/auth/register/verify`  | `{ email, response }` → `{ user }`. **201** for a new account, **200** when a passkey was added to an existing one. |
| `POST` | `/api/auth/login/options`    | `{ email }` → `PublicKeyCredentialRequestOptionsJSON`. 404 unknown email, 409 if the account has no passkey.        |
| `POST` | `/api/auth/login/verify`     | `{ email, response }` → `{ user }`. Advances the credential's signature counter.                                    |
| `POST` | `/api/auth/totp/setup`       | Signed in. → `{ uri, secret }`, the plaintext secret returned **once**. 409 if recovery is already on.              |
| `POST` | `/api/auth/totp/enable`      | Signed in. `{ token }` → `{ totpEnabled: true }`.                                                                   |
| `POST` | `/api/auth/totp/disable`     | Signed in. → `{ totpEnabled: false }`.                                                                              |
| `POST` | `/api/auth/totp/recover`     | `{ email, token }` → `{ user }`. Unauthenticated by necessity.                                                      |
| `POST` | `/api/auth/signout`          | 204. Idempotent.                                                                                                    |

**`register/options` means three different things**, decided by who is asking:

- no session, email free → a new account, written in `verify` (never in `options`, so an
  abandoned ceremony leaves no empty row holding an email hostage);
- a `DEMO` session → **upgrade in place**: the same row becomes a real account and keeps
  everything made during the trial (Decision 5);
- a session whose email matches → an **extra passkey** on that account, which is also how
  someone who came in through recovery gets back to a passkey.

**Rate limits**, all fixed-window in `auth_rate_limits`, keyed by email:
`register` and `login` 10 per 15 min, `recover` **5 per 15 min**, `demo` 3 per hour per
address. A 429 carries `Retry-After` in seconds. Recovery is the tight one for the obvious
reason: six digits, and what is behind it is a full session.

**An unknown email answers 404 rather than something vaguer.** That is an
account-existence oracle and a deliberate one — registration has to reject a taken email,
so the same fact is already discoverable there. Hiding it in sign-in would buy nothing and
cost the "no account, sign up instead" the UI can only show if it is told.

### Demo

| Method | Path        | Notes                                                                                                                              |
| ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/demo` | 201 with a new `DEMO` account and a session. 200 with the _same_ account if one is already in progress; 409 if signed in for real. |

A demo visitor is not in a mode — they hold a real account cloned from
`creed.bratton@dundermifflin.com`, isolated by `user_id` like anyone else, so no endpoint
above needs a `demo` flag. Requires `pnpm db:seed-office`; without the template the
endpoint answers 503 rather than failing opaquely.

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

**Uploads are Phase 4.** These endpoints record an `imageUrl` that already exists; they
do not accept the base64 `fileData` the SvelteKit actions took. Phase 4 adds the Vercel
Blob write in front of them, with `access: 'private'` for vehicle documents.

### Maintenance schedules

| Method   | Path                             | Notes                                                                          |
| -------- | -------------------------------- | ------------------------------------------------------------------------------ |
| `POST`   | `/api/maintenance-schedules`     | `vehicleId`, `name`, and at least one of `intervalMiles` / `intervalMonths`.   |
| `PATCH`  | `/api/maintenance-schedules/:id` | Marking one done is this, with `lastCompletedDate` and `lastCompletedMileage`. |
| `DELETE` | `/api/maintenance-schedules/:id` |                                                                                |

### Users

| Method   | Path               | Notes                                                                                     |
| -------- | ------------------ | ----------------------------------------------------------------------------------------- |
| `GET`    | `/api/users`       | **Admin only.** `?page=&pageSize=&sortBy=id\|username\|roles&sortOrder=asc\|desc&search=` |
| `GET`    | `/api/users/:uuid` | Own profile, or anyone's for an admin.                                                    |
| `PATCH`  | `/api/users/:uuid` | Own profile, or anyone's for an admin. **Only an admin may set `roles`.**                 |
| `DELETE` | `/api/users/:uuid` | Own account (ends the session) or, for an admin, anyone's.                                |

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
# 201, and the session cookie comes back in Set-Cookie
curl -s -c jar.txt -X POST -H "Origin: $BASE" $BASE/api/demo

curl -s -b jar.txt -H "Origin: $BASE" $BASE/api/vehicles
```

That needs `pnpm db:seed-office` to have run. Failing that, insert a session by hand:

```sql
INSERT INTO "user" (uuid, username, roles)
VALUES ('<uuid>', 'you@example.com', ARRAY[2, 3]);

-- id is the lowercase hex SHA-256 of the cookie value, not the value itself
INSERT INTO session (id, user_id, expires_at)
VALUES ('<sha256(token)>', '<uuid>', now() + interval '30 days');
```

```bash
TOKEN=whatever-you-hashed
curl -s -b "auth-session=$TOKEN" -H "Origin: $BASE" $BASE/api/vehicles
```

## Database setup

Three ways, in order of how little you need to hand:

**1. One paste — no tooling.** Open `drizzle/bootstrap.sql`, copy it, and run it in the
Neon SQL Editor (console.neon.tech → your project → SQL Editor). It is the schema plus the
three role rows, with every statement guarded so a second run is a no-op. This works from a
phone.

**2. A button.** The `Database migrate` GitHub Action (`.github/workflows/db-migrate.yml`)
runs `db:push` and `db:seed-roles`. Actions tab → Run workflow → `status` to look, `push` to
apply. Works from a phone, and the connection string never leaves GitHub Secrets.

Two things to know before relying on it:

- **It needs a new secret, `ASTRO_DATABASE_URL`.** Not `DATABASE_URL` — that one already
  exists and feeds `db-backup.yml`, which dumps the **legacy** database still serving
  frunk.cloud from Cloudflare. Sharing the name would let a schema push land on the live
  app. The workflow also refuses to run from `main`, where the SvelteKit config lives.
- **`workflow_dispatch` only lists workflows that exist on the default branch.** Until this
  file is on `main`, the Run workflow button will not appear. Use option 1 in the meantime.

A `push` requires typing the database name (run `status` first — it prints it), so it cannot
fire by accident, and it never runs on a git push: a migration should not be a side effect of
a deploy.

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

|                  |                                                                           |
| ---------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`   | Required. Points at the **new, blank** Neon database, not the legacy one. |
| `RP_ID`          | The WebAuthn relying-party id — `frunk.cloud` in production.              |
| `RP_ORIGIN`      | `https://frunk.cloud`.                                                    |
| `ENCRYPTION_KEY` | Seals the TOTP secret at rest. Required on any https deploy.              |

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
